const ws = require('ws')
const port = process.env.PORT || 9021

let clients = [];
let players = {};
let nextPlayerId = 100;

function broadcast(data) {
    clients.forEach(c => c.send(JSON.stringify(data)));
}

function playerId(clientId) {
    let pid = null;

    for (const [key, value] of Object.entries(players)) {
        if (value.cid == clientId) {
            pid = key;
        }
    }

    if (pid == null) {
        pid = nextPlayerId;
        players[pid] = {
            cid: clientId,
            pid,
            position: { x: 0, y : 0 },
            color: Math.floor(Math.random() * 16777215).toString(16)
        };
        nextPlayerId++;
    }

    return pid;
}

function parseClientData(data) {
    if (data.type == 'init' && data.cid > 0) {
        playerId(data.cid);
        broadcast({type: 'update', raw: players});
    }

    if (data.type == 'input' && data.cid > 0) {
        let player = players[playerId(data.cid)];
        player.position.x += 10 * (data.raw == 'left' ? -1 : 1);
        broadcast({type: 'update', raw: players});
    }
}

let webSocketServer = new ws.Server({port});
webSocketServer.on('connection', client => {
    client.id = clients.length;
    client.onmessage = message => parseClientData(JSON.parse(message.data));
    client.send(JSON.stringify({type: 'cid', raw: client.id}));
    clients.push(client);
    console.log(`Client connected (id: ${client.id})`);
});