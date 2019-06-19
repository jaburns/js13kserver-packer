(()=>{

    let socket = io()
      , shader = __inlineShader('flatWhite.glsl')
      , gl = C.getContext('webgl')
      , state

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

    let update = () => {
        gl.clearColor(0, 1, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        requestAnimationFrame(update);
    };

    update();

})();