module.exports=(()=>{

    let players = [];

    setInterval(() => {
        players.forEach(p => p.s.emit('s', players.map(p => ({x:p.x, y:p.y}))));
    },100);

    return socket => {
        players.push({
            s: socket,
            x: Math.random(),
            y: Math.random(),
        });

        socket.on('i', inputs => {
            console.log('client sent: ' + inputs);
        });
    };

})();