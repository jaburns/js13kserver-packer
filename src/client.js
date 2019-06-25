let gl = C.getContext('webgl');

//__insertGLOptimize

//__inlineFile soundbox-player.inc.js
//__inlineFile shaders.gen.js
//__inlineFile math.inc.js
//__inlineFile gfx.inc.js
//__inlineFile state.inc.js
//__inlineFile song.inc.js

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
        let vertLog = gl.getShaderInfoLog(vertShader);
        if (vertLog === null || vertLog.length > 0) {
            document.body.innerHTML = `<h1>Error in vertex shader:</h1><code>${vertLog.replace(/\n/g, '<br/>')}</code>`;
            throw new Error('Error compiling shader');
        }
    }

    let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, 'precision highp float;'+ship_frag);
    gl.compileShader(fragShader);

    if (__DEBUG) {
        let fragLog = gl.getShaderInfoLog(fragShader);
        if (fragLog === null || fragLog.length > 0) {
            document.body.innerHTML = `<h1>Error in fragment shader:</h1><code>${fragLog.replace(/\n/g, '<br/>')}</code>`;
            throw new Error('Error compiling shader');
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
        transform.r = quat_setAxisAngle([.16,.81,.57], t);
        transform.p[0] = 4*player.x - 2;
        transform.p[1] = 4*player.y - 2;
        transform.p[2] = -3;

        let projectionMatrix = mat4_perspective(aspectRatio, .01, 100);

        let viewMatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]; // something something camera

        let modelMatrix = Transform_toMatrix(transform);

        let mvp = mat4_multiply(projectionMatrix, mat4_multiply(viewMatrix, modelMatrix));

        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, 'u_mvp'), false, mvp);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.v);
        let posLoc = gl.getAttribLocation(shaderProg, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.i);
        gl.drawElements(gl.TRIANGLES, buffers.t, gl.UNSIGNED_SHORT, 0);

    });
};

let update = () => {
    if (lastState && state && buffers)
        render(state_lerp(lastState, state, (Date.now() - lastReceiveState) / G_TICK_MILLIS));
    requestAnimationFrame(update);
};

shaderProg = compileShader();

update();

gfx_loadModel('cube.8').then(x => buffers = x);

let exampleSFX={songData:[{i:[0,255,116,1,0,255,120,0,1,127,4,6,35,0,0,0,0,0,0,2,14,0,10,32,0,0,0,0],p:[1],c:[{n:[140],f:[]}]}],rowLen:5513,patternLen:32,endPattern:0,numChannels:1};

sbPlay(song);
sbPlay(exampleSFX, x => soundyBoi = x);

onclick = () => { soundyBoi.play(); };
