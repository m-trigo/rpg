const url = window.location.href;
const LOCAL = (url.includes('local') || url.includes('s2d')) ? true : false;
const serverAddress = LOCAL ? 'ws://localhost:9020' : 'wss://agile-temple-23495.herokuapp.com';

let server = null;
let cid = 0;
let pid = 0;

let screenCentre = s2d.vec.zero;
let serverOrigin = s2d.vec.zero;
let players = {};

let qrcode = null;
let playerUpdated = true;

function getPlayer(playerId = pid) {
    return players[playerId];
}

let lastNotifyTimestamp = {

};

let notifyCooldowns = {
}

function notify(type, raw = {}) {
    let now = s2d.time.elapsed();

    if (notifyCooldowns[type] && lastNotifyTimestamp[type]) {
        if (now - lastNotifyTimestamp[type] < notifyCooldowns[type]) {
            console.log(`Notify skipped (${type})`);
            return;
        }
    }

    server.send(JSON.stringify({type, raw}));
    lastNotifyTimestamp[type] = now;
}

function parseServerData(data) {
    if (data.type == 'cid') {
        cid = parseInt(data.raw);
        console.log(`Joined as client with id ${cid}`);
    }

    if (data.type == 'pid') {
        pid = parseInt(data.raw);
        console.log(`Joined as player with id ${pid}`);
    }

    if (data.type == 'qrcode') {
        //console.log(data.raw);

        let img = new Image();
        img.onload = () => qrcode = img;
        img.src = data.raw;

    }

    if (data.type == 'update') {
        if (pid > 0) {
            if (getPlayer() == undefined) {
                players = data.raw;
            }
            return;
        }

        // Update if newer
        if (players)
            playerUpdated = false;

        for (const player of Object.values(data.raw)) {
            if (getPlayer(player.pid) == undefined || player.updated > getPlayer(player.pid).updated) {
                players[player.pid] = player;
                playerUpdated = true;
            }
            else {
                console.log(`Dropped update`);
            }
        }

        if (!playerUpdated)
            console.log(`Player not updated this frame`);

        // Delete if missing
        for (const id of Object.keys(players)) {
            if (data.raw[id] == undefined) {
                delete players[id];
            }
        }
    }
}

function init() {
    s2d.canvas.resizeTo(window.innerWidth, window.innerHeight);
    screenCentre = s2d.vec.make(s2d.canvas.width() / 2, s2d.canvas.height() / 2);
    serverOrigin = screenCentre;

    server = new WebSocket(serverAddress);
    server.onopen = () => {
        console.log(`Connected to server`);
        if (window.location.href.includes('join')) {
            notify('join');
        }
    }
    server.onmessage = message => parseServerData(JSON.parse(message.data));
}

function update(dt) {

    if (pid == 0) {
        s2d.canvas.clear('#e1e1e1');

        for (const player of Object.values(players)) {
            let pos = s2d.vec.add(serverOrigin, player.position);
            let rect = s2d.rect.make(pos.x, pos.y, pos.x + 20, pos.y + 40);
            s2d.rect.draw(rect, player.color);
        }

        if (qrcode) {
            let context = s2d.canvas.context();
            context.drawImage(qrcode, 0, 0);
        }
    }
    else {
        let p = getPlayer();
        let modified = false;

        if (s2d.input.mouseDown()) {
            let touchPosition = s2d.input.mousePosition();
            p.position.x += 300 * dt * (touchPosition.x <= screenCentre.x ? - 1 : 1);
            modified = true;
        }

        if (modified) {
            p.updated = s2d.time.elapsed();
            notify('update', p);
        }

        s2d.canvas.clear('#424242');
        let line = s2d.rect.make(window.innerWidth/2 - 4, 0, window.innerWidth/2 + 4, window.innerHeight);
        s2d.rect.draw(line, '#e1e1e1');
    }
}

function main() {
    s2d.core.init(512, 512, null, init, update);
    console.log('Version 1');
}