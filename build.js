const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const uglify = require("uglify-es").minify;
const constants = require('./src/constants.json');
const webglFuncs = require('./webgl-funcs.json');

const SHADER_MIN_TOOL = process.platform === 'win32' ? 'tools\\shader_minifier.exe' : 'mono tools/shader_minifier.exe';
const ADVZIP_TOOL = process.platform === 'win32' ? '..\\..\\tools\\advzip.exe' : '../../tools/advzip.osx';
const MINIFY = process.argv[2] === '--small';

let shaderMinNames = 'abcdefghijklmnopqrstuvwxyz'.split('').map(x => 'z' + x);

const MAGIC_HASH_OFFSET = 3;

const extractGLSLFunctionName = proto =>
    proto.substring(proto.indexOf(' ') + 1, proto.indexOf('('));

const findExportedShaderIncludeFuncs = code => {
    const lines = code.split('\n').map(x => x.trim());
    const result = [];

    while (lines.length > 0) {
        const line = lines.shift();
        if (line.indexOf('//__export') >= 0) {
            result.push(extractGLSLFunctionName(lines.shift()));
        }
    }

    return result;
};

const findShaderIncludes = code => code
    .split('\n')
    .map(x => x.trim())
    .filter(x => x.startsWith('//__include'))
    .map(x => x.substr(x.indexOf(' ') + 1).replace('.', '_'));

const buildShaderIncludeFile = () => {
    let fileContents = '';
    let includedFuncs = [];
    let includeHeaderMappings = [];

    shell.find('shaders')
        .map(x => x)
        .sort((a, b) => a.endsWith('glsl') ? -1 : b.endsWith('glsl') ? 1 : 0)
        .forEach(x => {
            if (!(x.endsWith('.frag') || x.endsWith('.vert') || x.endsWith('.glsl'))) return;

            const rawFile = fs.readFileSync(x, 'utf8');
            const varFileName = x.substr(x.indexOf('/')+1).replace('.', '_');
            const includes = findShaderIncludes(rawFile);

            if (includes.length > 0)
                includeHeaderMappings = includeHeaderMappings
                    .concat({file: varFileName, incs: includes });

            if (MINIFY) {
                const incFuncs = findExportedShaderIncludeFuncs(rawFile);
                const incFuncsArg = incFuncs.length > 0 ? `--no-renaming-list ${incFuncs}` : '';

                includedFuncs = includedFuncs.concat(incFuncs);

                shell.exec(`${SHADER_MIN_TOOL} --preserve-externals ${incFuncsArg} --format js ${x} -o tmp.js`, {silent: true});
                fileContents += fs.readFileSync('tmp.js', 'utf8');
            } else {
                fileContents += `var ${varFileName} = \`${rawFile}\`;\n\n`;
            }
        });

    shell.rm('-rf', 'tmp.js');

    includedFuncs = _.uniq(includedFuncs);

    let lines = fileContents.split('\n');

    _.zip(includedFuncs, shaderMinNames.splice(0, includedFuncs.length)).forEach(([from, to]) => {
        lines = lines.map(line =>
            line.trim().startsWith('"')
                ? line.replace(new RegExp(from, 'g'), to)
                : line);
    });

    fileContents = lines.join('\n');

    includeHeaderMappings.forEach(({file, incs}) => {
        fileContents = fileContents.replace(`var ${file} =`, `var ${file} = ${incs.join('+')} +`);
    });

    return fileContents;
};

const findShaderInternalReplacements = allShaderCode => {
    const externals = _.flatten([
        _.uniq(allShaderCode.match(/v_[a-zA-Z0-9_]+/g)),
        _.uniq(allShaderCode.match(/u_[a-zA-Z0-9_]+/g)),
        _.uniq(allShaderCode.match(/a_[a-zA-Z0-9_]+/g))
    ]);

    if (externals.length > shaderMinNames.length) {
        console.log('Not enough names in shaderMinNames');
        process.exit(1);
    }

    return _.zip(
        externals.map(x => new RegExp(x, 'g')),
        shaderMinNames.splice(0, externals.length)
    );
};

const findSharedFunctionReplacements = sharedCode => {
    const cashGlobals = _.uniq(sharedCode.match(/\$[a-zA-Z0-9_]+/g));
    const shortGlobals = _.range(0, cashGlobals.length).map(x => '$' + x);

    return _.zip(
        cashGlobals.map(x => new RegExp('\\'+x, 'g')),
        shortGlobals
    );
};

const findExternalFileReplacementsAndRenameFiles = () => {
    const files = shell.ls('js13kserver/public');
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

    files.forEach((x, i) => {
        shell.mv('js13kserver/public/'+x, 'js13kserver/public/'+alphabet[i]);
    });

    return _.zip(
        files.map(x => new RegExp(x.replace(/\./g, '\\.'), 'g')),
        alphabet.slice(0, files.length)
    );
};

const replaceIncludeDirectivesWithInlinedFiles = code => {
    const lines = code.split('\n');
    const result = [];

    lines.forEach(line => {
        const label = '//__include';
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

const mangleGLCalls = code => {
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
        console.log('\nAdjust the value of MAGIC_HASH_OFFSET in build.js until no more collisions occur :)\n');
        process.exit(1);
    }

    code = code.replace('//__insertGLOptimize', `for (let k in gl) { ${hashAlgo}; gl[s] = gl[k]; }`);

    glCalls.forEach(func => {
        code = code.replace(new RegExp(`gl\\.${func}([^a-zA-Z0-9])`, 'g'), `gl.${genHash(func)}$1`);
    });

    return code;
};

const processFile = (replacements, file, code) => {
    if (!MINIFY) {
        if (file === 'shared.js') {
            for (let k in constants) {
                code = `let ${k} = ${constants[k]};\n` + code;
            }
        }
        return code;
    }

    replacements.forEach(([from, to]) => code = code.replace(from, to));

    if (file === 'client.js') code = mangleGLCalls(code);

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
        }
    });

    if (typeof uglifyResult.code !== 'string') {
        console.log(code);
        console.log(uglifyResult);
        process.exit(1);
    }

    return uglifyResult.code;
};

const processHTML = (html, clientJS) =>
    html.split('\n').map(x => x.trim()).join('').replace('__clientJS', clientJS.replace(/"/g, "'"))

const main = () => {
    constants.__DEBUG = !MINIFY;

    shell.rm('-rf', './js13kserver/public');
    shell.mkdir('-p', './js13kserver/public');
    shell.cp('-r', './public/*', './js13kserver/public/');
    shell.cp('./js13kserver-index.js', 'js13kserver/index.js');

    console.log('Packing shaders...');

    const allShaderCode = buildShaderIncludeFile();
    fs.writeFileSync('./src/shaders.gen.js', allShaderCode);

    const clientCode = replaceIncludeDirectivesWithInlinedFiles(fs.readFileSync('./src/client.js', 'utf8'));
    const sharedCode = replaceIncludeDirectivesWithInlinedFiles(fs.readFileSync('./src/shared.js', 'utf8'));
    const serverCode = replaceIncludeDirectivesWithInlinedFiles(fs.readFileSync('./src/server.js', 'utf8'));

    const replacements = MINIFY ? _.flatten([
        findShaderInternalReplacements(allShaderCode),
        findSharedFunctionReplacements(sharedCode),
        findExternalFileReplacementsAndRenameFiles()
    ]) : [];

    console.log('Packing javascript...');

    const finalClientJS = processFile(replacements, 'client.js', clientCode);
    const finalHTML = processHTML(fs.readFileSync(MINIFY ? 'src/index.html' : 'src/index.debug.html', 'utf8'), finalClientJS);

    fs.writeFileSync('./js13kserver/public/index.html', finalHTML);
    fs.writeFileSync('./js13kserver/public/shared.js', processFile(replacements, 'shared.js', sharedCode));
    fs.writeFileSync('./js13kserver/public/server.js', processFile(replacements, 'server.js', serverCode));

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
