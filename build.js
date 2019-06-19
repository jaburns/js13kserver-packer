const fs = require('fs');
const _ = require('lodash');
const shell = require('shelljs');
const uglify = require("uglify-es").minify;

const clientCode = fs.readFileSync('./src/client.js', 'utf8');
const sharedCode = fs.readFileSync('./src/shared.js', 'utf8');
const serverCode = fs.readFileSync('./src/server.js', 'utf8');

const GLOBALS = _.uniq(sharedCode.replace(/[ \t\n\r]+/g, ' ').split(' '))
    .filter(x => x.startsWith('$') && /^\$[_0-9a-zA-Z]+/.test(x));

const MINIFY = process.argv[2] === '--small';

const getShaderStringFromPath = path => {
    if (MINIFY) {
        shell.exec(`glsl-minifier -i "${path}" -o ./tmp.min.glsl`);
        const shaderMin = fs.readFileSync('./tmp.min.glsl', 'utf8');
        shell.rm('-rf', './tmp.min.glsl');
        return "'" + shaderMin + "'";
    } else {
        const shader = fs.readFileSync(path, 'utf8');
        return '`' + shader + '`';
    }
};

const handleInlineShaderCalls = code => {
    for (let match; match = /__inlineShader\('.+'\)/.exec(code); ) {
        const filename = match[0].replace("__inlineShader('", '').replace("')", '');
        const shaderString = getShaderStringFromPath(`./src/shaders/${filename}`);
        code = code.replace(match[0], shaderString);
    }

    return code;
};

const processFile = code => {
    code = handleInlineShaderCalls(code);

    if (MINIFY) code = uglify(code).code;

    const genSmallGlobals = n => _.range(0, n).map(x => '$' + x);
    
    _.zip(GLOBALS, genSmallGlobals(GLOBALS.length)).forEach(([from, to]) => {
        code = code.replace(new RegExp('\\'+from, 'g'), to);
    });

    return code;
};

shell.rm('-rf', './js13kserver/public');
shell.mkdir('-p', './js13kserver/public');
shell.cp('-r', './src/*', './js13kserver/public/');
shell.rm('-rf', './js13kserver/public/shaders');

fs.writeFileSync('./js13kserver/public/client.js', processFile(clientCode));
fs.writeFileSync('./js13kserver/public/shared.js', processFile(sharedCode));
fs.writeFileSync('./js13kserver/public/server.js', processFile(serverCode));