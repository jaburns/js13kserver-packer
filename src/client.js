let gl = C.getContext('webgl');

//__insertGLOptimize

//__include soundbox-player.inc.js
//__include shaders.gen.js
//__include math.inc.js
//__include gfx.inc.js
//__include state.inc.js
//__include song.inc.js

let socket = io()
  , lastReceiveState
  , lastState
  , state
  , shaderProg = gfx_compileProgram(ship_vert, ship_frag)
  , fxShader = gfx_compileProgram(screen_vert, screen_frag)
  , bufferRenderer = gfx_createBufferRenderer()
  , frameBuffer = gfx_createFrameBufferTexture()
  , cubeModel
  , aspectRatio
  , soundyBoi
  , transform = Transform_create()
  , resizeFunc = () => {
        C.width = innerWidth;
        C.height = innerHeight;
        frameBuffer.r(C.width, C.height);
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

gl.clearColor(0, 0, 0, 1);
gl.enable(gl.DEPTH_TEST);

let render = state => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.f);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProg);

    state.forEach((player, i) => {
        let t = Date.now() / 1000 + i*1.7;
        transform.r = quat_setAxisAngle([.16,.81,.57], t);
        transform.p[0] = 4*player.x - 2;
        transform.p[1] = 4*player.y - 2;
        transform.p[2] = -3;

        let projectionMatrix = mat4_perspective(aspectRatio, .01, 100);
        let viewMatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
        let modelMatrix = Transform_toMatrix(transform);
        let mvp = mat4_multiply(projectionMatrix, mat4_multiply(viewMatrix, modelMatrix));
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProg, 'u_mvp'), false, mvp);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.v);
        let posLoc = gl.getAttribLocation(shaderProg, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeModel.i);
        gl.drawElements(gl.TRIANGLES, cubeModel.t, gl.UNSIGNED_SHORT, 0);
    });

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    bufferRenderer.d(fxShader, frameBuffer.t);
};

let update = () => {
    if (lastState && state && cubeModel)
        render(state_lerp(lastState, state, (Date.now() - lastReceiveState) / G_TICK_MILLIS));
    requestAnimationFrame(update);
};

update();

gfx_loadModel('cube.8').then(x => cubeModel = x);

let exampleSFX={songData:[{i:[0,255,116,1,0,255,120,0,1,127,4,6,35,0,0,0,0,0,0,2,14,0,10,32,0,0,0,0],p:[1],c:[{n:[140],f:[]}]}],rowLen:5513,patternLen:32,endPattern:0,numChannels:1};

sbPlay(song);
sbPlay(exampleSFX, x => soundyBoi = x);

onclick = () => { soundyBoi.play(); };
