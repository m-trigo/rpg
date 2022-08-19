const { EOL } = require('os');
const ws = require('ws')
const { CLOSED, OPEN } = require('ws');

const port = process.env.PORT || 9021

let nextClientId = 1;

let webSocketServer = new ws.Server({port});
webSocketServer.on('connection', client => {
    client.id = nextClientId++;
    console.log(`New client connected (id: ${client.id})`);
    //client.onmessage = event => handlePayload(client, JSON.parse(event.data));
    //client.send(JSON.stringify({type: 'rooms', data: Object.keys(activeRooms)}));
});