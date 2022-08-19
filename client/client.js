const validStates = ['unjoined', 'selecting', 'joined'];
const maxUsernameLength = 16;
const maxLineLength = 44;
let state = validStates[0];
let socket = null;
let username = null;
let joinedRoom = null;
let lastMessageSent = '';

function onNewRoomSelected() {
    username = document.getElementById('usernameText').value;
    socket.send(JSON.stringify({ type: 'new', data: { room: undefined, username } }));
}

function onJoinExistingSelected() {
    socket.send(JSON.stringify({ type: 'rooms' }));
}

function onRoomSelected() {
    let room = document.getElementById('roomsAvailable').value;
    username = document.getElementById('usernameText').value;
    socket.send(JSON.stringify({ type: 'join', data: { room, username }}));
}

function sendMessage() {
    let message = document.getElementById('messageText');
    let text = message.value.trim();
    if (!text) {
        return;
    }
    socket.send(JSON.stringify({
        type: 'message',
        data: { room: joinedRoom, username, text }
    }));
    lastMessageSent = message.value;
    message.value = null;
}

function updateState(newState) {
    if (!validStates.includes(newState)) {
        console.assert(validStates.includes(newState));
        return;
    }
    state = newState;
    validStates.forEach(validState => {
        let element = document.getElementById(validState);
        element.hidden = state != validState;
    });
}

function handlePayload(payload) {
    switch(payload.type) {
        case 'rooms':
            let roomSelectorElement = document.getElementById('roomsAvailable')
            payload.data.forEach(roomName => {
                let optionElement = document.createElement('option');
                optionElement.text = roomName;
                roomSelectorElement.add(optionElement);
            });
            updateState('selecting');
        break;
        case 'joined':
            joinedRoom = payload.data;
            let roomLabel = document.getElementById('roomLabel');
            roomLabel.innerText = `[ ${joinedRoom} ]`;
            updateState('joined');
            document.getElementById('messageText').focus();
        break;
        case 'chatUpdate':
            let chatHistory = document.getElementById('chatHistory');
            let history = '';
            let lastUsername = '';
            payload.data.forEach(message => {
                if (lastUsername != message.username) {
                    if (lastUsername) {
                        history += '\n';
                    }
                    history += `[${message.username}]\n`;
                    lastUsername = message.username;
                }
                history += message.text + '\n';
            });
            chatHistory.innerText = history;
        break;
    }
}

function main() {
    socket = new WebSocket('ws://localhost:5000'); // TODO: Get from package.json
    // Handle failure with a 'SERVER OFFLINE' screen
    //socket.onopen = event => console.log(event);
    socket.onmessage = message => handlePayload(JSON.parse(message.data));

    let usernameField = document.getElementById('usernameText');
    usernameField.focus();
    usernameField.onkeyup = e => {
        document.getElementById('newRoom').disabled = e.target.value.length == 0;
        document.getElementById('joinExisting').disabled = e.target.value.length == 0;
    }
    usernameField.onkeypress = e => {
        if (usernameField.value.length > maxUsernameLength) {
            usernameField.value = usernameField.value.substr(0, maxUsernameLength);
        }
    }

    let messageField = document.getElementById('messageText');
    messageField.onkeypress = e => {
        if (messageField.value.length > maxLineLength) {
            messageField.value = messageField.value.substr(0, maxLineLength);
        }
        if (e.key == 'Enter') {
            sendMessage();
        }
    }
    messageField.onkeyup = e => { if (e.key == 'ArrowUp') { messageField.value = lastMessageSent; } }
}
