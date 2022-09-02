const ws = require('ws');
//const express = require('express');

const port = process.env.PORT || 9020;

let clients = [];

let nextClientId = 1;
let nextPlayerId = 100;

let players = {};
let modified = false;

let joinQrCode = "";

/* Networking */

function playerClients() {
    return clients.filter(c => c.pid != undefined);
}

function screenClients() {
    return clients.filter(c => c.pid == undefined);
}

function notify(client, type, raw) {
    client.send(JSON.stringify({type, raw}));
}

function broadcast(raw, who = 'all') {

    // Don't send an empty object update
    if (typeof(raw) == 'object' && Object.keys(raw).length === 0) {
        return;
    }

    let group = [];

    if (who == 'all') {
        group = clients;
    }

    if (who == 'players') {
        group = playerClients();
    }

    if (who == 'screens') {
        group = screenClients();
    }

    group.forEach(c => notify(c, 'update', raw))
}

/* Gameplay */

function playerId(cid) {
    for (const player of Object.values(players)) {
        if (player.cid == cid) {
            return player.pid;
        }
    }
}

function createPlayer(cid) {
    let randomColour = () => {
        let colours = [
            'red', 'green', 'blue', 'purple', 'orange'
        ];

        return colours[Math.floor(Math.random() * colours.length)];
    };
    let pid = nextPlayerId;
    players[pid] = {
        cid,
        pid,
        position: { x: 0, y : 0 },
        color: randomColour(),
        updated: 0
    };
    nextPlayerId++;
    modified = true;
    return pid;
}

function parseClientData(client, data) {

    if (data.type == 'join') {
        let pid = createPlayer(client.id);
        notify(client, 'pid', pid);
        notify(client, 'update', players);
        console.log(`Player joined (pid: ${pid})`)
    }

    if (data.type == 'update') {
        let player = players[playerId(client.id)];
        if (player.updated < data.raw.updated) {
            players[playerId(client.id)] = data.raw;
            modified = true;
        }
    }
}

function handleDisconnect(cid) {
    clients = clients.filter(c => c.id != cid)
    console.log(`Client disconnected (cid: ${cid})`);

    let pid = playerId(cid);
    if (pid) {
        delete players[pid];
        modified = true;
        console.log(`Player disconnected (pid ${pid})`);
    }
}

// let app = express();
// app.use(express.static('builds'));

// let webSocketServer = new ws.Server({ noServer: true });
let webSocketServer = new ws.Server({ port });
webSocketServer.on('connection', client => {
    client.id = nextClientId++;
    client.onmessage = message => parseClientData(client, JSON.parse(message.data));
    client.onclose = c => handleDisconnect(c.target.id);
    notify(client, 'cid', client.id);
    notify(client, 'qrcode', joinQrCode);
    clients.push(client);
    modified = true;
    console.log(`Client connected (cid: ${client.id})`);
});

// let httpServer = app.listen(port, () => console.log(`Listening on port ${port}`));
// httpServer.on('upgrade', (request, socket, head) => {
//     webSocketServer.handleUpgrade(request, socket, head, client => {
//         webSocketServer.emit('connection', client, request);
//     });
// });

setInterval(() => {
    if (modified) {
        modified = false;
        broadcast(players, 'screens')
    }
}, 5);


var qrcode = require('qrcode')
qrcode.toDataURL('https://m-trigo.github.io/rpg?join', (error, base64String) => {
    if (error) {
        console.log(error);
    }

    joinQrCode = base64String;
})