const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const uglify = require("uglify-es").minify;
const constants = require('./src/constants.json');

const MINIFY = process.argv[2] === '--small';

const SHADER_MIN_TOOL = process.platform === 'win32' ? 'tools\\shader_minifier.exe' : 'mono tools/shader_minifier.exe';

const buildShaderIncludeFile = () => {
    let fileContents = '';

    shell.find('shaders').forEach(x => {
        if (!(x.endsWith('.frag') || x.endsWith('.vert'))) return;

        if (MINIFY) {
            console.log('Minifying shader '+x+'...');
            shell.exec(SHADER_MIN_TOOL + " --preserve-externals --format js "+x+" -o tmp.js", {silent: true});
            fileContents += fs.readFileSync('tmp.js', 'utf8');
        } else {
            console.log('Inlining shader '+x+'...');
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

    console.log('Inlining include files in to '+file+'...');

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

const allShaderCode = buildShaderIncludeFile();
fs.writeFileSync('./src/shaders.gen.js', allShaderCode);

const handleDebug = code =>
    code.replace(/__DEBUG/g, MINIFY ? 'false' : 'true');

const clientCode = handleDebug(handleInlineFileComments('client.js', fs.readFileSync('./src/client.js', 'utf8')));
const sharedCode = handleDebug(handleInlineFileComments('shared.js', fs.readFileSync('./src/shared.js', 'utf8')));
const serverCode = handleDebug(handleInlineFileComments('server.js', fs.readFileSync('./src/server.js', 'utf8')));

const cashGlobals = _.uniq(sharedCode.match(/\$[a-zA-Z0-9_]+/g));

// TODO this hash function collides on a few gl context functions, but apparently not
// ones we are using yet. Should output a collision report so we can fiddle with the hash
// if we end up needing a broken function name.
const handleGLCalls = code => {
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

const processFile = (file, code) => {
    if (MINIFY) {
        if (file === 'client.js') {
            console.log('Mangling gl context function names in client.js...');
            code = handleGLCalls(code);

            console.log('Replacing references to shader externals with minified names in client.js...');
            findShaderInternalReplacements(allShaderCode).forEach(([from, to]) => {
                code = code.replace(new RegExp(from, 'g'), to);
            });
        }

        console.log('Minifying '+file+' with Uglify...');

        const uglifyResult = uglify(code, {
            compress: {
                ecma: 6,
                keep_fargs: false,
                passes: 2,
                pure_funcs: [ /*TODO maybe find pure funcs*/ ],
                pure_getters: true,

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

        if (uglifyResult.code) {
            code = uglifyResult.code;
        } else {
            console.log(code);
            console.log(uglifyResult);
            process.exit(1);
        }
    }

    const genSmallGlobals = a => _.range(0, a).map(x => '$' + x);

    _.zip(cashGlobals, genSmallGlobals(cashGlobals.length)).forEach(([from, to]) => {
        code = code.replace(new RegExp('\\'+from, 'g'), to);
    });

    console.log('Writing '+file+'...');
    return code;
};

shell.rm('-rf', './js13kserver/public');
shell.mkdir('-p', './js13kserver/public');
shell.cp('-r', './src/*', './js13kserver/public/');
shell.cp('-r', './public/*', './js13kserver/public/');
shell.rm('-rf', './js13kserver/public/shaders');
shell.rm('-rf', './js13kserver/public/*.lib.js');
shell.rm('-rf', './js13kserver/public/*.gen.js');
shell.rm('-rf', './js13kserver/public/constants.json');

fs.writeFileSync('./js13kserver/public/client.js', processFile('client.js', clientCode));
fs.writeFileSync('./js13kserver/public/shared.js', processFile('shared.js', sharedCode));
fs.writeFileSync('./js13kserver/public/server.js', processFile('server.js', serverCode));

console.log('Overwriting js13kserver/index.js with local version...');
shell.cp('./js13kserver-index.js', 'js13kserver/index.js');

console.log('Done!');
