"use strict";
process.chdir(__dirname);

const fs = require('fs');
const express = require('express');
const session = require('express-session');
const parser = require('body-parser');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const code = fs.readFileSync('./public/server.js', 'utf8');
const shared = fs.readFileSync('./public/shared.js', 'utf8');
const storage = require('./lib/storage');

function createSandbox() {
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        storage: storage.interface,
        io: io
    };

    Object.defineProperty(sandbox, 'module', {
        enumerable: true,
        configurable: false,
        writable: false,
        value: Object.create(null)
    });
    sandbox.module.exports = Object.create(null);
    sandbox.exports = sandbox.module.exports;
    return sandbox;
};

app.set('port', (process.env.PORT || 3000))
    .set('storage', process.env.DATABASE_URL || 'sqlite:storage.sqlite')
    .get('/server-info', (req, res) => {
        let limit = 13312,
            storageSize = storage.interface.size();
        res.set('Content-Type', 'text/plain').send(
            `Storage: ${storageSize} byte / ${(storageSize ? storageSize / limit * 100 : 0).toFixed(2)}%`
        );
    })
    .use(express.static('public'))
    .use(session({ secret: 'js13kserver', saveUninitialized: false, resave: false }));

storage.init(app.get('storage')).then(() => {
    const sandbox = createSandbox();
    require('vm').runInNewContext(shared + '\n' + code, sandbox);
    if (typeof sandbox.module.exports == 'function') {
        io.on('connection', sandbox.module.exports);
    } else if (typeof sandbox.module.exports == 'object') {
        app.use(parser.urlencoded({ extended: true }))
            .use(parser.json());
        for (let route in sandbox.module.exports) {
            if (route == 'io') {
                io.on('connection', sandbox.module.exports[route]);
            } else {
                app.all('/' + route, sandbox.module.exports[route])
            }
        }
    }
    server.listen(app.get('port'), () => {
        console.log('Server started at port: ' + app.get('port'));
    });
}).catch(err => {
    console.error(err);
});
