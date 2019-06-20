if (__DEBUG) {
    window.errorHTML = (kind, log) => `
        <h1>Error in ${kind} shader:</h1>
        <code>${log.replace(/\n/g, '<br/>')}</code>
    `;
}

(()=>{
    //__TOP

let mat4_create = () => {
  let out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

let mat4_perspective = (out, fovy, aspect, near, far) => {
  let f = 1.0 / Math.tan(fovy / 2), nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;
  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = (2 * far * near) * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }
  return out;
}



    let socket = io()
      , shader = __inlineShader('flatWhite.glsl')
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

        console.log(aspectRatio);

    //  Transform.toMatrix(ship, m4x);
    //  Camera.getViewMatrix(camera, m4y);
    //  mat4.mul(m4x, m4y, m4x);
    //  Camera.getProjectionMatrix(camera, m4y);
    //  mat4.mul(m4x, m4y, m4x);

        //let m4x = new Float32Array([-0.9898824095726013, -0.14189064502716064, 0, 0, 0.14189064502716064, -0.9898824095726013, 0, 0, 0, 0, -1.0002000331878662, -1, -0.7855497002601624, -1.9689877033233643, 4.9809980392456055, 5]);
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

})();