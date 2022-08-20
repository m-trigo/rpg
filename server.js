const ws = require('ws')
const port = process.env.PORT || 9021

let clients = [];

let webSocketServer = new ws.Server({port});
webSocketServer.on('connection', client => {
    client.id = clients.length;
    clients.push(client);
    client.onmessage = event => {
        clients.forEach(c => c.send(JSON.stringify(event.data)));
    }
    console.log(`Client connected (id: ${client.id})`);
});