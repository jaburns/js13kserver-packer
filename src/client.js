if (__DEBUG) {
    window.errorHTML = (kind, log) => `
        <h1>Error in ${kind} shader:</h1>
        <code>${log.replace(/\n/g, '<br/>')}</code>
    `;
}

(()=>{
    let socket = io()
      , shader = __inlineShader('flatWhite.glsl')
      , gl = C.getContext('webgl')
      , state
      , shaderProg

    window.onresize = () => {
        C.width = window.innerWidth;
        C.height = window.innerHeight;
        gl.viewport(0, 0, C.width, C.height);
    };

    socket.on("connect", () => {
        window.onclick = () => {
            socket.emit('i', $sharedMessage);
        };

        socket.on('s', s => state = s);
    });

    let compileShader = () => {
        let vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(shader[0]);
        gl.compileShader(vertShader);

        if (__DEBUG) {
            let vertLog = gl.getShaderInfoLog(vertShader); //__GL_DEBUG
            if (vertLog === null || vertLog.length > 0) {
                document.body.innerHTML = errorHTML('vertex', name, vertLog);
                throw new Error('Error compiling shader: ' + name);
            }
        }

        let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(shader[1]);
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

    let update = () => {
        gl.clearColor(0, 1, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        requestAnimationFrame(update);
    };

    shaderProg = compileShader();

    update();

})();