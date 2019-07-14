let gl = C.getContext('webgl');

//__insertGLOptimize

//gl.getExtension('OES_texture_float');
//gl.getExtension('OES_texture_float_linear');

//__include soundbox-player.inc.js
//__include shaders.gen.js
//__include math.inc.js
//__include gfx.inc.js
//__include state.inc.js
//__include song.inc.js

let socket = io()
  , lastReceiveState
  , lastState
  , currentState 
  , cubeProg = gfx_compileProgram(cube_vert, cube_frag)
  , blurPassProg = gfx_compileProgram(fullQuad_vert, blurPass_frag)
  , pickBloomPassProg = gfx_compileProgram(fullQuad_vert, pickBloomPass_frag)
  , composePassProg = gfx_compileProgram(fullQuad_vert, composePass_frag)
  , fxaaPassProg = gfx_compileProgram(fullQuad_vert, fxaaPass_frag)
  , frameBuffer0 = gfx_createFrameBufferTexture()
  , frameBuffer1 = gfx_createFrameBufferTexture()
  , frameBuffer2 = gfx_createFrameBufferTexture()
  , cubeModel
  , aspectRatio
  , soundEffect
  , transform = Transform_create()
  , resizeFunc = () => {
        let w = innerWidth, h = innerHeight;
        C.width = w;
        C.height = h;
        frameBuffer0.r(w, h);
        frameBuffer1.r(w, h);
        frameBuffer2.r(w, h);
        gl.viewport(0, 0, w, h);
        aspectRatio = w / h;
    };

onresize = resizeFunc;
resizeFunc();

socket.on("connect", () => {
    onkeydown = k => socket.emit('d', k.keyCode);
    onkeyup = k => socket.emit('u', k.keyCode);

    socket.on('s', s => {
        lastState = currentState;
        currentState = s;
        lastReceiveState = Date.now();
    });
});

gl.clearColor(0, 0, 0, 1);

let drawScene = state => {
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(cubeProg);

    state.forEach((player, i) => {
        let t = Date.now() / 1000 + i*1.7;
        transform.r = quat_setAxisAngle([.16,.81,.57], t);
        transform.p[0] = 4*player.x - 2;
        transform.p[1] = 4*player.y - 2;
        transform.p[2] = -3;

        let projectionMatrix = mat4_perspective(aspectRatio, .01, 100);
        let viewMatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
        let modelMatrix = Transform_toMatrix(transform);
        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_model'), false, modelMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_view'), false, viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_proj'), false, projectionMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.v);
        let posLoc = gl.getAttribLocation(cubeProg, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.n);
        posLoc = gl.getAttribLocation(cubeProg, 'a_normal');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeModel.i);
        gl.drawElements(gl.TRIANGLES, cubeModel.t, gl.UNSIGNED_SHORT, 0);
    });
};

let render = state => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer0.f);

    drawScene(state);

    gl.disable(gl.DEPTH_TEST);

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer1.f);

    gfx_renderBuffer(pickBloomPassProg, frameBuffer0.t); 

    // Now: 0 -> scene, 1 -> only bloom sources, 2 -> nothing

    for (let i = 0; i < 10; ++i) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer2.f);

        gfx_renderBuffer(blurPassProg, frameBuffer1.t, () => {
            gl.uniform2f(gl.getUniformLocation(blurPassProg, 'u_direction'), 0, 1);
        });

        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer1.f);

        gfx_renderBuffer(blurPassProg, frameBuffer2.t, () => {
            gl.uniform2f(gl.getUniformLocation(blurPassProg, 'u_direction'), 1, 0);
        });
    }

    // Now: 0 -> scene, 1 -> blurred bloom, 2 -> nothing

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer2.f);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gfx_renderBuffer(composePassProg, frameBuffer0.t, () => {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, frameBuffer1.t);
        gl.uniform1i(gl.getUniformLocation(composePassProg, 'u_bloom'), 1);
    });

    // Now: 0 -> scene, 1 -> blurred bloom, 2 -> composed scene with bloom

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gfx_renderBuffer(fxaaPassProg, frameBuffer2.t);
};

let update = () => {
    if (lastState && currentState && cubeModel)
        render(state_lerp(lastState, currentState, (Date.now() - lastReceiveState) / G_TICK_MILLIS));
    requestAnimationFrame(update);
};

update();

gfx_loadModel('cube.8').then(x => cubeModel = x);

let exampleSFX=__includeSongData({songData:[{i:[0,255,116,1,0,255,120,0,1,127,4,6,35,0,0,0,0,0,0,2,14,0,10,32,0,0,0,0],p:[1],c:[{n:[140],f:[]}]}],rowLen:5513,patternLen:32,endPattern:0,numChannels:1});
sbPlay(exampleSFX, x => soundEffect = x);

sbPlay(song);

onclick = soundEffect;
