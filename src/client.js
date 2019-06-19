(()=>{

    let socket = io({ upgrade: false, transports: ["websocket"] });

    console.log('starting');

    const shader = __inlineShader('example.glsl');

    socket.on("connect", () => {
        console.log('connected!');

        $globalB();
    });

    console.log(__inlineShader('example.glsl'));
    console.log(shader);

})();