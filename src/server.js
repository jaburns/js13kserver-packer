module.exports=(()=>{

    const LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40;

    let players = [];

    setInterval(() => {
        players.forEach(p => {
            if (p.k.indexOf(LEFT)  >= 0) p.x -= 0.05;
            if (p.k.indexOf(UP)    >= 0) p.y += 0.05;
            if (p.k.indexOf(RIGHT) >= 0) p.x += 0.05;
            if (p.k.indexOf(DOWN)  >= 0) p.y -= 0.05;

            p.s.emit('s', players.map(p => ({x:p.x, y:p.y})));
        });
    }, $TICK_MILLIS);

    return socket => {
        let self = {
            s: socket,
            x: Math.random(),
            y: Math.random(),
            k: [],
        };

        players.push(self);

        socket.on('d', keyCode => {
            if (self.k.indexOf(keyCode) < 0) self.k.push(keyCode);
        });

        socket.on('u', keyCode => {
            let index = self.k.indexOf(keyCode);
            if (index >= 0) self.k.splice(index, 1);
        });
    };

})();