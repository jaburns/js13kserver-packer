if (__DEBUG) {
    window.errorHTML = (kind, log) => `
        <h1>Error in ${kind} shader:</h1>
        <code>${log.replace(/\n/g, '<br/>')}</code>
    `;
}

(()=>{
//__TOP

    //__inlineFile soundbox-player.lib.js
    //__inlineFile math.lib.js

    let socket = io()
      , shader = __inlineShader('ship.glsl')
      , gl = C.getContext('webgl')
      , state
      , shaderProg
      , vertexBuffer
      , indexBuffer
      , aspectRatio
      , resizeFunc = () => {
            C.width = innerWidth;
            C.height = innerHeight;
            gl.viewport(0, 0, C.width, C.height);
            aspectRatio = C.width / C.height;
        };

    onresize = resizeFunc;
    resizeFunc();

    socket.on("connect", () => {
        onclick = () => {
            socket.emit('i', $sharedMessage);
        };

        socket.on('s', s => state = s);
    });

    let compileShader = () => {
        let vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, shader[0]);
        gl.compileShader(vertShader);

        if (__DEBUG) {
            let vertLog = gl.getShaderInfoLog(vertShader); //__GL_DEBUG
            if (vertLog === null || vertLog.length > 0) {
                document.body.innerHTML = errorHTML('vertex', name, vertLog);
                throw new Error('Error compiling shader: ' + name);
            }
        }

        let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader, shader[1]);
        gl.compileShader(fragShader);

        if (__DEBUG) {
            const fragLog = gl.getShaderInfoLog(fragShader); //__GL_DEBUG
            if (fragLog === null || fragLog.length > 0) {
                document.body.innerHTML = errorHTML('fragment', name, fragLog);
                throw new Error('Error compiling shader: ' + name);
            }
        }

        let prog = gl.createProgram();
        gl.attachShader(prog, vertShader);
        gl.attachShader(prog, fragShader);
        gl.linkProgram(prog);
        return prog;
    };

    let verts = [0.2492,0,0.1102,-0.0237,0.1333,-0.081,0.04749999,-0.0506,0.0031,-0.0564,-0.0337,-0.1155,-0.003200002,-0.1747,-0.09190001,-0.149,-0.1102,-0.084,-0.158,-0.0931,-0.158,-0.0332,-0.1347,0,-0.158,0.0332,-0.158,0.0931,-0.1102,0.084,-0.09190001,0.149,-0.003200002,0.1747,-0.0337,0.1155,0.0031,0.0564,0.04749999,0.0506,0.1333,0.081,0.1102,0.0237];
    let tris = [1,0,11,3,1,11,4,3,11,5,4,11,8,5,11,9,8,11,10,9,11,2,1,3,6,5,7,7,5,8,21,11,0,19,11,21,18,11,19,17,11,18,14,11,17,13,11,14,12,11,13,20,19,21,15,14,17,16,15,17];

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tris), gl.STATIC_DRAW);

    let update = () => {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(shaderProg);

        let cameraMatrix = mat4_create();
        mat4_perspective(cameraMatrix, Math.PI/2, aspectRatio, .01, 100);

    //  Transform.toMatrix(ship, m4x);
    //  Camera.getViewMatrix(camera, m4y);
    //  mat4.mul(m4x, m4y, m4x);
    //  Camera.getProjectionMatrix(camera, m4y);
    //  mat4.mul(m4x, m4y, m4x);

        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, 'u_mvp'), false, cameraMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        let posLoc = gl.getAttribLocation(shaderProg, "i_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, tris.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(update);
    };

    shaderProg = compileShader();

    update();

    var exampleSong={songData:[{i:[2,192,128,0,2,192,128,3,0,0,32,222,60,0,0,2,188,3,1,3,55,241,60,67,53,5,75,5],p:[1,2,3,4,3,4],c:[{n:[123],f:[]},{n:[118],f:[]},{n:[123,111],f:[]},{n:[118,106],f:[]}]},{i:[3,100,128,0,3,201,128,7,0,0,17,43,109,0,0,3,113,4,1,1,23,184,2,29,147,6,67,3],p:[,,1,2,1,2],c:[{n:[123,,,,,,,,123,,,,,,,,123,,,,,,,,123,,,,,,,,126,,,,,,,,126,,,,,,,,126,,,,,,,,126,,,,,,,,130,,,,,,,,130,,,,,,,,130,,,,,,,,130],f:[]},{n:[122,,,,,,,,122,,,,,,,,122,,,,,,,,122,,,,,,,,125,,,,,,,,125,,,,,,,,125,,,,,,,,125,,,,,,,,130,,,,,,,,130,,,,,,,,130,,,,,,,,130],f:[]}]},{i:[0,192,99,1,0,80,99,0,0,3,4,0,66,0,0,0,19,4,1,2,86,241,18,195,37,4,0,0],p:[,,1,1,1,1,1],c:[{n:[147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147],f:[]}]},{i:[2,146,140,0,2,224,128,3,0,0,84,0,95,0,0,3,179,5,1,2,62,135,11,15,150,3,157,6],p:[,,,,1,2],c:[{n:[147,,145,,147,,,,,,,,,,,,135],f:[11,,,,,,,,,,,,,,,,11,,,,,,,,,,,,,,,,27,,,,,,,,,,,,,,,,84]},{n:[142,,140,,142,,,,,,,,,,,,130],f:[11,,,,,,,,,,,,,,,,11,,,,,,,,,,,,,,,,27,,,,,,,,,,,,,,,,84]}]}],rowLen:6615,patternLen:32,endPattern:6,numChannels:4};
    sbPlay(exampleSong);

})();