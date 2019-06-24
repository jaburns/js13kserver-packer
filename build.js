const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const uglify = require("uglify-es").minify;

const MINIFY = process.argv[2] === '--small';

const buildShaderIncludeFile = () => {
};

const handleInlineFileComments = code => {
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

const handleDebug = code => {
    code = code.replace(/__DEBUG/g, MINIFY ? 'false' : 'true');

    if (MINIFY)
        code = code.split('\n')
            .filter(x => x.indexOf('__GL_DEBUG') < 0)
            .join('\n');

    return code;
};

// fs.writeFileSync('./src/shaders.gen.js', buildShaderIncludeFile());

const clientCode = handleDebug(handleInlineFileComments(fs.readFileSync('./src/client.js', 'utf8')));
const sharedCode = handleDebug(handleInlineFileComments(fs.readFileSync('./src/shared.js', 'utf8')));
const serverCode = handleDebug(handleInlineFileComments(fs.readFileSync('./src/server.js', 'utf8')));

const cashGlobals = _.uniq(sharedCode.match(/\$[a-zA-Z0-9_]+/g));

const genSmallGlobals = a => _.range(0, a).map(x => '$' + x);

// TODO this hash function collides on a few gl context functions, but apparently not
// ones we are using yet. Should output a collision report so we can fiddle with the hash
// if we end up needing a broken function name.
const handleGLCalls = code => {
    const genHashesSrc = `
        let Z = String.fromCharCode;
        for (let k in gl) {
            let n = k.split('').map(x=>255-x.charCodeAt(0)).reduce((a,v,i)=>v<<i%16*2^a),
                m = (n<0?-n:n)%17576,
                s = Z(65+m%26) + Z(65+m/26%26) + Z(65+m/676);
            gl[s] = gl[k];
        }
    `;

    const genHash = k => {
        let Z = String.fromCharCode;
        let n = k.split('').map(x=>255-x.charCodeAt(0)).reduce((a,v,i)=>v<<i%16*2^a),
            m = (n<0?-n:n)%17576,
            s = Z(65+m%26) + Z(65+m/26%26) + Z(65+m/676);
        return s;
    };

    const newGLName = from => 'gl.' + genHash(from.substr(3));

    code = code.replace('//__INSERT_GL_OPTIMIZE', genHashesSrc);

    const glCalls = _.uniq(code.match(/gl\.[a-zA-Z0-9_]+/g));

    glCalls.forEach(glName => {
        code = code.replace(new RegExp(glName.replace('.', '\\.') + '([^a-zA-Z0-9])', 'g'), newGLName(glName)+'$1');
    });

    return code;
};

const processFile = (code, isClient) => {
    if (MINIFY) {
        if (isClient) code = handleGLCalls(code);

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
    
    _.zip(cashGlobals, genSmallGlobals(cashGlobals.length)).forEach(([from, to]) => {
        code = code.replace(new RegExp('\\'+from, 'g'), to);
    });

    return code;
};

shell.rm('-rf', './js13kserver/public');
shell.mkdir('-p', './js13kserver/public');
shell.cp('-r', './src/*', './js13kserver/public/');
shell.cp('-r', './public/*', './js13kserver/public/');
shell.rm('-rf', './js13kserver/public/shaders');
shell.rm('-rf', './js13kserver/public/*.lib.js');
shell.rm('-rf', './js13kserver/public/*.gen.js');

fs.writeFileSync('./js13kserver/public/client.js', processFile(clientCode, true));
fs.writeFileSync('./js13kserver/public/shared.js', processFile(sharedCode, false));
fs.writeFileSync('./js13kserver/public/server.js', processFile(serverCode, false));

shell.cp('./js13kserver-index.js', 'js13kserver/index.js');