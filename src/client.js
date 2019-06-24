if (__DEBUG) {
    window.errorHTML = (kind, log) => `
        <h1>Error in ${kind} shader:</h1>
        <code>${log.replace(/\n/g, '<br/>')}</code>
    `;
}

(()=>{
    let gl = C.getContext('webgl');

    //__INSERT_GL_OPTIMIZE

    //__inlineFile soundbox-player.lib.js
    //__inlineFile shaders.gen.js
    //__inlineFile math.lib.js
    //__inlineFile model.lib.js
    //__inlineFile state.lib.js

    let socket = io()
      , lastReceiveState
      , lastState
      , state
      , shaderProg
      , buffers
      , aspectRatio
      , soundyBoi
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
        onkeydown = k => socket.emit('d', k.keyCode);
        onkeyup = k => socket.emit('u', k.keyCode);

        socket.on('s', s => {
            lastState = state;
            state = s;
            lastReceiveState = Date.now();
        });
    });

    let compileShader = () => {
        let vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, ship_vert);
        gl.compileShader(vertShader);

        if (__DEBUG) {
            let vertLog = gl.getShaderInfoLog(vertShader); //__GL_DEBUG
            if (vertLog === null || vertLog.length > 0) {
                document.body.innerHTML = errorHTML('vertex', name, vertLog);
                throw new Error('Error compiling shader: ' + name);
            }
        }

        let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader, 'precision highp float;'+ship_frag);
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

    let render = state => {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(shaderProg);

        state.forEach((player, i) => {
            let t = Date.now() / 1000 + i*1.7;
            quat_setAxisAngle(transform.r, [.16,.81,.57], t);
            transform.p[0] = 4*player.x - 2;
            transform.p[1] = 4*player.y - 2;
            transform.p[2] = -3;

            let projectionMatrix = mat4_create();
            mat4_perspective(projectionMatrix, Math.PI/2, aspectRatio, .01, 100);

            let viewMatrix = mat4_create();
            // something something camera

            let modelMatrix = mat4_create();
            Transform_toMatrix(transform, modelMatrix);

            let mvp = mat4_multiply(mat4_create(), projectionMatrix, mat4_multiply(mat4_create(), viewMatrix, modelMatrix));

            gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, 'u_mvp'), false, mvp);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.v);
            let posLoc = gl.getAttribLocation(shaderProg, 'i_position');
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.i);
            gl.drawElements(gl.TRIANGLES, buffers.t, gl.UNSIGNED_SHORT, 0);

        });
    };


    let update = () => {
        if (lastState && state && buffers)
            render(state_lerp(lastState, state, (Date.now() - lastReceiveState) / $TICK_MILLIS));
        requestAnimationFrame(update);
    };

    shaderProg = compileShader();

    update();

    model_import('cube.8').then(x => buffers = x);

    let exampleSFX={songData:[{i:[0,255,116,1,0,255,120,0,1,127,4,6,35,0,0,0,0,0,0,2,14,0,10,32,0,0,0,0],p:[1],c:[{n:[140],f:[]}]}],rowLen:5513,patternLen:32,endPattern:0,numChannels:1};

    //__inlineFile song.lib.js

    sbPlay(song);
    sbPlay(exampleSFX, x => soundyBoi = x);

    onclick = () => { soundyBoi.play(); };

})();
