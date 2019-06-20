const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const uglify = require("uglify-es").minify;

const MINIFY = process.argv[2] === '--small';

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

const clientCode = handleDebug(handleInlineFileComments(fs.readFileSync('./src/client.js', 'utf8')));
const sharedCode = handleDebug(handleInlineFileComments(fs.readFileSync('./src/shared.js', 'utf8')));
const serverCode = handleDebug(handleInlineFileComments(fs.readFileSync('./src/server.js', 'utf8')));

const onlyDupes = arr => _.uniq(_.filter(arr, (v, i, a) => a.indexOf(v) !== i));

const cashGlobals = _.uniq(sharedCode.match(/\$[a-zA-Z0-9_]+/g));
const glGlobals = onlyDupes(clientCode.match(/gl\.[a-zA-Z0-9_]+/g));

const genSmallGlobals = (a, b) => _.range(a, a+b).map(x => '$' + x);

const getShaderStringFromPath = path => {
    const shader = fs.readFileSync(path, 'utf8');
    const vertex = '#define VERTEX\n' + shader;
    const fragment = 'precision highp float;\n#define FRAGMENT\n' + shader;

    if (!MINIFY) {
        return `[\`${vertex}\`,\`${fragment}\`]`;
    }

    fs.writeFileSync('./tmp.min.glsl', vertex);
    shell.exec(`glsl-minifier -sT vertex -i ./tmp.min.glsl -o ./tmp.min.glsl`);
    const vertexMin = fs.readFileSync('./tmp.min.glsl', 'utf8');

    fs.writeFileSync('./tmp.min.glsl', fragment);
    shell.exec(`glsl-minifier -sT fragment -i ./tmp.min.glsl -o ./tmp.min.glsl`);
    const fragmentMin = fs.readFileSync('./tmp.min.glsl', 'utf8');

    shell.rm('-rf', './tmp.min.glsl');

    return `['${vertexMin}','${fragmentMin}']`;
};

const handleInlineShaderCalls = code => {
    for (let match; match = /__inlineShader\('.+'\)/.exec(code); ) {
        const filename = match[0].replace("__inlineShader('", '').replace("')", '');
        const shaderString = getShaderStringFromPath(`./src/shaders/${filename}`);
        code = code.replace(match[0], shaderString);
    }

    return code;
};

const handleGLCalls = code => {
    const lookup = _.zip(glGlobals, genSmallGlobals(0, glGlobals.length));

    lookup.forEach(([from, to]) => {
        code = code.replace(new RegExp(from.replace('.', '\\.'), 'g'), 'gl['+to+']');
    });

    const lookupCode = lookup.map(([from, to]) => `${to}='${from.substr(3)}'`).join(',');
    return code.replace('//__TOP', 'let '+lookupCode+';');
};

const processFile = code => {
    code = handleInlineShaderCalls(code);

    if (MINIFY) code = uglify(code).code;
    
    _.zip(cashGlobals, genSmallGlobals(glGlobals.length, cashGlobals.length)).forEach(([from, to]) => {
        code = code.replace(new RegExp('\\'+from, 'g'), to);
    });

    return code;
};

shell.rm('-rf', './js13kserver/public');
shell.mkdir('-p', './js13kserver/public');
shell.cp('-r', './src/*', './js13kserver/public/');
shell.rm('-rf', './js13kserver/public/shaders');
shell.rm('-rf', './js13kserver/public/*.lib.js');

fs.writeFileSync('./js13kserver/public/client.js', processFile(MINIFY ? handleGLCalls(clientCode) : clientCode));
fs.writeFileSync('./js13kserver/public/shared.js', processFile(sharedCode));
fs.writeFileSync('./js13kserver/public/server.js', processFile(serverCode));

shell.cp('./js13kserver-index.js', 'js13kserver/index.js');