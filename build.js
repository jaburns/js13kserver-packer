const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const uglify = require("uglify-es").minify;
const constants = require('./src/constants.json');

const SHADER_MIN_TOOL = process.platform === 'win32' ? 'tools\\shader_minifier.exe' : 'mono tools/shader_minifier.exe';
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

const handleGLCalls = code => {
    // TODO this hash function collides on a few gl context functions, but apparently not
    // ones we are using yet. Should output a collision report so we can fiddle with the hash
    // if we end up needing a broken function name.

    const genHashesSrc = `
        let Z = String.fromCharCode;
        for (let k in gl) {
            let n = k.split('').map(x=>255-x.charCodeAt(0)).reduce((a,v,i)=>v<<i%16*2^a),
                m = (n<0?-n:n)%17576,
                s = Z(97+m%26) + Z(97+m/26%26) + Z(97+m/676);
            gl[s] = gl[k];
        }
    `;

    const genHash = k => {
        let Z = String.fromCharCode;
        let n = k.split('').map(x=>255-x.charCodeAt(0)).reduce((a,v,i)=>v<<i%16*2^a),
            m = (n<0?-n:n)%17576,
            s = Z(97+m%26) + Z(97+m/26%26) + Z(97+m/676);
        return s;
    };

    const newGLName = from => 'gl.' + genHash(from.substr(3));

    code = code.replace('//__insertGLOptimize', genHashesSrc);

    const glCalls = _.uniq(code.match(/gl\.[a-zA-Z0-9_]+/g));

    glCalls.forEach(glName => {
        code = code.replace(new RegExp(glName.replace('.', '\\.') + '([^a-zA-Z0-9])', 'g'), newGLName(glName)+'$1');
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

    console.log('Done!');
};

main();
