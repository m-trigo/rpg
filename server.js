const {EOL} = require('os');
const ws = require('ws')
const fs = require('fs');
const { CLOSED, OPEN } = require('ws');
const port = process.env.PORT || 5000
const serverTickMilliseconds = 1000;

let possibleRoomNames = null;
fs.readFile('./roomNames.txt', 'utf8' , (err, data) => possibleRoomNames = data.split(EOL).map(line => line.toUpperCase()));

let activeRooms = {};
class Room {
    constructor() {
        this.inactive = false;
        this.clients = [];
        this.chatHistory = [];
        console.assert(possibleRoomNames.length > 0);
        let nameIndex = Math.floor(Math.random() * possibleRoomNames.length);
        possibleRoomNames = possibleRoomNames.filter(name => name != this.name);
        console.log(`Rooms left: ${possibleRoomNames.length}`);
        this.name = possibleRoomNames[nameIndex];
        activeRooms[this.name] = this;
    }

    addClient(client, username) {
        client['room'] = this.name;
        client['username'] = username;
        this.clients.push(client);
        console.log(`${client.username} (${client.id}) joined ${client.room}`);
        client.send(JSON.stringify({ type: 'joined', data: client.room }));
        client.send(JSON.stringify({ type: 'chatUpdate', data: this.chatHistory }));
    }

    addMessage(username, text) {
        this.chatHistory.push({username, text});
        this.clients.forEach(client => {
            client.send(JSON.stringify({
                type: 'chatUpdate',
                data: this.chatHistory
            }));
        });
    }
};

function handlePayload(client, payload) {
    switch(payload.type) {
        case 'new':
            let newRoom = new Room();
            newRoom.addClient(client, payload.data.username);
        break;
        case 'join':
            if (!activeRooms[payload.data.room]) {
                console.log(`Room ${payload.data.room} does not exist or is inactive`);
                return;
            }
            activeRooms[payload.data.room].addClient(client, payload.data.username);
        break;
        case 'message':
            if (!activeRooms[payload.data.room]) {
                console.log(`Message from inactive room ${payload.data.room}`);
                return;
            }
            activeRooms[payload.data.room].addMessage(payload.data.username, payload.data.text);
        break;
        case 'rooms':
            client.send(JSON.stringify({type: 'rooms', data: Object.keys(activeRooms)}));
        break;
    }
}

let nextClientId = 1;
let webSocketServer = new ws.Server({port});
webSocketServer.on('connection', client => {
    client.id = nextClientId++;
    console.log(`New client connected (id: ${client.id})`);
    client.onmessage = event => handlePayload(client, JSON.parse(event.data));
})

let evergreenRoom = "";

function roomReclamation() {

    if (!evergreenRoom) {
        let evergreen = new Room();
        evergreenRoom = evergreen.name;
    }

    let roomKeys = Object.keys(activeRooms);
    roomKeys.forEach(roomKey => {
        let room = activeRooms[roomKey];
        room.inactive = true;
        room.clients.forEach(client => {
            if (client.readyState != CLOSED) {
                room.inactive = false;
            }
        });
    });
    roomKeys.forEach(roomKey => {
        if (activeRooms[roomKey].inactive && roomKey != evergreenRoom) {
            console.log(`Room key ${roomKey} reclaimed`);
            delete activeRooms[roomKey];
            possibleRoomNames.push(roomKey);
        }
    })
}

setInterval(roomReclamation, serverTickMilliseconds);