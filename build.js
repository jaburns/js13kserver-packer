const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const uglify = require("uglify-es").minify;
const constants = require('./src/constants.json');
const webglFuncs = require('./webgl-funcs.json');

const MAGIC_HASH_OFFSET = 2;

const SHADER_MIN_TOOL = process.platform === 'win32' ? 'tools\\shader_minifier.exe' : 'mono tools/shader_minifier.exe';
const ADVZIP_TOOL = process.platform === 'win32' ? '..\\..\\tools\\advzip.exe' : '../../tools/advzip.osx';
const MINIFY = process.argv[2] === '--small';

const buildShaderIncludeFile = () => {
    let fileContents = '';

    shell.find('shaders').forEach(x => {
        if (!(x.endsWith('.frag') || x.endsWith('.vert'))) return;

        if (MINIFY) {
            shell.exec(SHADER_MIN_TOOL + " --preserve-externals --format js "+x+" -o tmp.js", {silent: true});
            fileContents += fs.readFileSync('tmp.js', 'utf8');
        } else {
            fileContents += `var ${x.substr(x.indexOf('/')+1).replace('.', '_')} = \`${fs.readFileSync(x, 'utf8')}\`;\n\n`;
        }
    });

    shell.rm('-rf', 'tmp.js');

    return fileContents;
};

const findShaderInternalReplacements = allShaderCode => {
    const externals = _.flatten([
        _.uniq(allShaderCode.match(/v_[a-zA-Z0-9_]+/g)),
        _.uniq(allShaderCode.match(/u_[a-zA-Z0-9_]+/g)),
        _.uniq(allShaderCode.match(/a_[a-zA-Z0-9_]+/g))
    ]);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return _.zip(externals, alphabet.slice(0, externals.length));
};

const handleInlineFileComments = (file, code) => {
    const lines = code.split('\n');
    const result = [];

    lines.forEach(line => {
        const label = '//__inlineFile';
        const index = line.indexOf(label);
        if (index >= 0) {
            const filename = line.substr(index + label.length).trim();
            result.push(fs.readFileSync('src/' + filename, 'utf8'));
        } else {
            result.push(line);
        }
    });

    return result.join('\n');
};

const findHashCollisions = (hashFunc, items) => {
    const hashes = items.map(hashFunc);
    const dupes = _.uniq(_.filter(hashes, (v, i, a) => a.indexOf(v) !== i));

    return items
        .map((x, i) => dupes.indexOf(hashes[i]) >= 0 ? x : null)
        .filter(x => x !== null);
};

const handleGLCalls = code => {
    const hashAlgo = `
        let Z = String.fromCharCode,
            n = k.split('').map(x=>x.charCodeAt(0)+${MAGIC_HASH_OFFSET}).reduce((a,v,i)=>v<<i%16*2^a),
            m = (n<0?-n:n)%17576,
            s = Z(97+m%26) + Z(97+m/26%26) + Z(97+m/676)`;

    const genHash = k => eval(hashAlgo + ';s');

    const glCalls = _.uniq(code.match(/gl\.[a-zA-Z0-9_]+/g)).map(x => x.substr(3));
    const allCollisions = findHashCollisions(genHash, webglFuncs);
    const localCollisions = glCalls.map(x => allCollisions.indexOf(x) >= 0 ? x : null).filter(x => x !== null);

    if (localCollisions.length > 0) {
        console.log('The source is using one or more WebGL calls which collide in the mangler:');
        console.log(localCollisions);
        console.log('\nThe following identifiers are currently not mangled uniquely:');
        console.log(allCollisions);
        console.log('\nAdjust the value of MAGIC_HASH_OFFSET in build.js until no more collisions occur :)');
        process.exit(1);
    }

    code = code.replace('//__insertGLOptimize', `for (let k in gl) { ${hashAlgo}; gl[s] = gl[k]; }`);

    glCalls.forEach(func => {
        code = code.replace(new RegExp(`gl\\.${func}([^a-zA-Z0-9])`, 'g'), `gl.${genHash(func)}$1`);
    });

    return code;
};

const processFile = (cashGlobals, shaderReplacements, file, code) => {
    const shortGlobals = _.range(0, cashGlobals.length).map(x => '$' + x);

    _.zip(cashGlobals, shortGlobals).forEach(([from, to]) => {
        code = code.replace(new RegExp('\\'+from, 'g'), to);
    });

    if (!MINIFY) {
        return 'let __DEBUG=true;' + code;
    }

    if (file === 'client.js') {
        code = handleGLCalls(code);

        shaderReplacements.forEach(([from, to]) => {
            code = code.replace(new RegExp(from, 'g'), to);
        });
    }

    const uglifyResult = uglify(code, {
        toplevel: file !== 'shared.js',
        compress: {
            ecma: 6,
            keep_fargs: false,
            passes: 2,
            pure_funcs: [],
            pure_getters: true,
            global_defs: constants,

            unsafe: true,
            unsafe_arrows : true,
            unsafe_comps: true,
            unsafe_Function: true,
            unsafe_math: true,
            unsafe_methods: true,
            unsafe_proto: true,
            unsafe_regexp: true,
            unsafe_undefined:true,
        },
        mangle: {
            reserved: shortGlobals
        }
    });

    if (typeof uglifyResult.code !== 'string') {
        console.log(code);
        console.log(uglifyResult);
        process.exit(1);
    }

    return uglifyResult.code;
};

const processHTML = html =>
    html.split('\n').map(x => x.trim()).join('');

const main = () => {
    constants.__DEBUG = !MINIFY;

    console.log('Packing shaders...');
    const allShaderCode = buildShaderIncludeFile();
    fs.writeFileSync('./src/shaders.gen.js', allShaderCode);
    const shaderReplacements = findShaderInternalReplacements(allShaderCode);

    const clientCode = handleInlineFileComments('client.js', fs.readFileSync('./src/client.js', 'utf8'));
    const sharedCode = handleInlineFileComments('shared.js', fs.readFileSync('./src/shared.js', 'utf8'));
    const serverCode = handleInlineFileComments('server.js', fs.readFileSync('./src/server.js', 'utf8'));

    const cashGlobals = _.uniq(sharedCode.match(/\$[a-zA-Z0-9_]+/g));

    shell.rm('-rf', './js13kserver/public');
    shell.mkdir('-p', './js13kserver/public');
    shell.cp('-r', './public/*', './js13kserver/public/');
    shell.cp('./js13kserver-index.js', 'js13kserver/index.js');

    console.log('Packing javascript...');
    fs.writeFileSync('./js13kserver/public/client.js', processFile(cashGlobals, shaderReplacements, 'client.js', clientCode));
    fs.writeFileSync('./js13kserver/public/shared.js', processFile(cashGlobals, null, 'shared.js', sharedCode));
    fs.writeFileSync('./js13kserver/public/server.js', processFile(cashGlobals, null, 'server.js', serverCode));
    fs.writeFileSync('./js13kserver/public/index.html', processHTML(fs.readFileSync('src/index.html', 'utf8')));

    if (!MINIFY) {
        console.log('Done!\n');
        return;
    }

    console.log('Packing zip archive...');
    shell.cd('js13kserver/public');
    shell.exec(ADVZIP_TOOL + ' -q -a -4 ../../bundle.zip *');
    shell.cd('../..');

    const bytes = fs.statSync('bundle.zip').size;

    console.log('Done!\n');
    console.log(`Final archive size: ${bytes} of 13312 / ${(bytes / 13312 * 100).toFixed(2)}%\n`);
};

main();
