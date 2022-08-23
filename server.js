const ws = require('ws')
const port = process.env.PORT || 9021

let clients = [];
let players = {};
let nextPlayerId = 100;

function notify(client, type, raw) {
    client.send(JSON.stringify({type, raw}));
}

function broadcast(raw) {
    clients.forEach(c => notify(c, 'update', raw))
}

function playerId(cid) {
    for (const [key, value] of Object.entries(players)) {
        if (value.cid == cid) {
            return value.pid;
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
        color: randomColour()
    };
    nextPlayerId++;
    return pid;
}

function parseClientData(client, data) {
    if (data.type == 'init') {
        notify(client, 'update', players);
    }

    if (data.type == 'join') {
        let pid = createPlayer(client.id);
        notify(client, 'pid', pid);
        console.log(`Player joined (pid: ${pid})`)
    }

    if (data.type == 'update') {
        players[playerId(client.id)] = data.raw;
    }

    if (data.type == 'offscreen') {
        players[data.raw.pid].offscreen = data.raw.value;
    }
}

function handleDisconnect(cid) {
    clients = clients.filter(c => c.id != cid)
    console.log(`Client disconnected (cid: ${cid})`);

    let pid = playerId(cid);
    if (pid) {
        delete players[pid];
        console.log(`Player disconnected (pid ${pid})`);
    }
}

let webSocketServer = new ws.Server({port});
webSocketServer.on('connection', client => {
    client.id = clients.length;
    client.onmessage = message => parseClientData(client, JSON.parse(message.data));
    client.onclose = c => handleDisconnect(c.target.id);
    notify(client, 'cid', client.id);
    notify(client, 'update', players);
    clients.push(client);
    console.log(`Client connected (cid: ${client.id})`);
});

setInterval(() => broadcast(players), 50);