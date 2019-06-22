if (__DEBUG) {
    window.errorHTML = (kind, log) => `
        <h1>Error in ${kind} shader:</h1>
        <code>${log.replace(/\n/g, '<br/>')}</code>
    `;
}

(()=>{
//__TOP

    let gl = C.getContext('webgl');

    //__inlineFile soundbox-player.lib.js
    //__inlineFile math.lib.js
    //__inlineFile model.lib.js

    let socket = io()
      , shader = __inlineShader('ship.glsl')
      , state
      , shaderProg
      , buffers
      , aspectRatio
      , transform = Transform_create()
      , resizeFunc = () => {
            C.width = innerWidth;
            C.height = innerHeight;
            gl.viewport(0, 0, C.width, C.height);
            aspectRatio = C.width / C.height;
        };

    onresize = resizeFunc;

    resizeFunc();

    socket.on("connect", () => {
        onkeydown = k => socket.emit('kd', k.keyCode);
        onkeyup = k => socket.emit('ku', k.keyCode);

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
        gl.shaderSource(fragShader, 'precision highp float;'+shader[1]);
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

    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);

    let update = () => {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(shaderProg);

        if (state && buffers) state.forEach((player, i) => {

            let t = Date.now() / 1000 + i*1.7;
            quat_setAxisAngle(transform.r, [0,1,1], t);
            transform.p[0] = 4*player.x - 2;
            transform.p[1] = 4*player.y - 2;
            transform.p[2] = -3 + Math.sin(1.5*t);

            let projectionMatrix = mat4_create();
            mat4_perspective(projectionMatrix, Math.PI/2, aspectRatio, .01, 100);

            let viewMatrix = mat4_create();
            // something something camera

            let modelMatrix = mat4_create();
            Transform_toMatrix(transform, modelMatrix);

            let mvp = mat4_multiply(mat4_create(), projectionMatrix, mat4_multiply(mat4_create(), viewMatrix, modelMatrix));

            gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, 'u_mvp'), false, mvp);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.v);
            let posLoc = gl.getAttribLocation(shaderProg, "i_position");
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.i);
            gl.drawElements(gl.TRIANGLES, buffers.t, gl.UNSIGNED_SHORT, 0);

        });

        requestAnimationFrame(update);
    };

    shaderProg = compileShader();

    update();

    model_import('cylinder.m8').then(x => buffers = x);

    var exampleSong={songData:[{i:[2,192,128,0,2,192,128,3,0,0,32,222,60,0,0,2,188,3,1,3,55,241,60,67,53,5,75,5],p:[1,2,3,4,3,4],c:[{n:[123],f:[]},{n:[118],f:[]},{n:[123,111],f:[]},{n:[118,106],f:[]}]},{i:[3,100,128,0,3,201,128,7,0,0,17,43,109,0,0,3,113,4,1,1,23,184,2,29,147,6,67,3],p:[,,1,2,1,2],c:[{n:[123,,,,,,,,123,,,,,,,,123,,,,,,,,123,,,,,,,,126,,,,,,,,126,,,,,,,,126,,,,,,,,126,,,,,,,,130,,,,,,,,130,,,,,,,,130,,,,,,,,130],f:[]},{n:[122,,,,,,,,122,,,,,,,,122,,,,,,,,122,,,,,,,,125,,,,,,,,125,,,,,,,,125,,,,,,,,125,,,,,,,,130,,,,,,,,130,,,,,,,,130,,,,,,,,130],f:[]}]},{i:[0,192,99,1,0,80,99,0,0,3,4,0,66,0,0,0,19,4,1,2,86,241,18,195,37,4,0,0],p:[,,1,1,1,1,1],c:[{n:[147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147],f:[]}]},{i:[2,146,140,0,2,224,128,3,0,0,84,0,95,0,0,3,179,5,1,2,62,135,11,15,150,3,157,6],p:[,,,,1,2],c:[{n:[147,,145,,147,,,,,,,,,,,,135],f:[11,,,,,,,,,,,,,,,,11,,,,,,,,,,,,,,,,27,,,,,,,,,,,,,,,,84]},{n:[142,,140,,142,,,,,,,,,,,,130],f:[11,,,,,,,,,,,,,,,,11,,,,,,,,,,,,,,,,27,,,,,,,,,,,,,,,,84]}]}],rowLen:6615,patternLen:32,endPattern:6,numChannels:4};
    sbPlay(exampleSong);

})();
