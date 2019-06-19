const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const uglify = require("uglify-es").minify;

const clientCode = fs.readFileSync('./src/client.js', 'utf8');
const sharedCode = fs.readFileSync('./src/shared.js', 'utf8');
const serverCode = fs.readFileSync('./src/server.js', 'utf8');

const cashGlobals = _.uniq(sharedCode.match(/\$[a-zA-Z0-9_]+/g));
const glGlobals = _.uniq(clientCode.match(/gl\.[a-zA-Z0-9_]+/g));

const MINIFY = process.argv[2] === '--small';

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

    return 'let '+lookupCode+';'+code;
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

fs.writeFileSync('./js13kserver/public/client.js', processFile(handleGLCalls(clientCode)));
fs.writeFileSync('./js13kserver/public/shared.js', processFile(sharedCode));
fs.writeFileSync('./js13kserver/public/server.js', processFile(serverCode));