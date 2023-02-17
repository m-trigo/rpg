const ws = require('ws');
const port = process.env.PORT || 9020;

let clients = [];
let game_clients = [];
let nextClientId = 1;

function notify(client, type, raw) {
    client.send(JSON.stringify({type, raw}));
}

let game_notify_count = 0;
function parseClientData(client, data) {
    if (data.type == 'update') {
        // Next Step // game client + controller pairing logic
        for (client of clients) {
            if (game_clients.includes(client.id)) {
                notify(client, 'update', data.raw)
                game_notify_count += 1;
                console.log(`game_notify_count: ${game_notify_count}`)
                console.log(data.raw)
            }
        }
    }

    if (data.type == 'register') {
        game_clients.push(client.id)
    }
}

function handleDisconnect(cid) {
    clients = clients.filter(c => c.id != cid)
    console.log(`Client disconnected (cid: ${cid})`);
}

let webSocketServer = new ws.Server({ port }); // new ws.Server({ noServer: true });
webSocketServer.on('connection', client => {
    client.id = nextClientId++;
    client.onmessage = message => parseClientData(client, JSON.parse(message.data));
    client.onclose = c => handleDisconnect(c.target.id);
    clients.push(client);
    notify(client, 'cid', client.id);
    console.log(`Client connected (cid: ${client.id})`);
});