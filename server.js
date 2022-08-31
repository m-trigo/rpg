const ws = require('ws');
const express = require('express');

const port = process.env.PORT || 9020;
const server = express();

let clients = [];

let nextClientId = 1;
let nextPlayerId = 100;

let players = {};
let modified = false;

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
            '#00008B', '#DC143C', '#A52A2A', '#8A2BE2',
            '#006400', '#8B0000', '#FF1493', '#1E90FF',
            '#B22222', '#228B22', '#4B0082', '#4169E1'
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

let webSocketServer = new ws.Server({ server });
webSocketServer.on('connection', client => {
    client.id = nextClientId++;
    client.onmessage = message => parseClientData(client, JSON.parse(message.data));
    client.onclose = c => handleDisconnect(c.target.id);
    notify(client, 'cid', client.id);
    clients.push(client);
    modified = true;
    console.log(`Client connected (cid: ${client.id})`);
});

setInterval(() => {
    if (modified) {
        modified = false;
        broadcast(players, 'screens')
    }
}, 5);

server.listen(port, () => console.log(`Listening on port ${port}`));
server.use(express.static('builds'));