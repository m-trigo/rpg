const url = window.location.href;
const LOCAL = (url.includes('local') || url.includes('s2d')) ? true : false;
const serverAddress = LOCAL ? 'ws://localhost:9020' : 'wss://agile-temple-23495.herokuapp.com';

let server = null;
let cid = 0;
let pid = 0;

let screenCentre = s2d.vec.zero;
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

    let width = window.innerWidth //* 0.8;
    let height = window.innerHeight //* 0.8;
    s2d.canvas.resizeTo(width, height);
    screenCentre = s2d.vec.make(width / 2, height / 2);
    let serverOrigin = screenCentre;

    s2d.canvas.clear('ghostwhite');

    if (pid == 0) {
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
            //notify('update', p);
        }

        // Player Input UI
        let line = s2d.rect.make(width/2 - 4, 0, width/2 + 4, height);
        s2d.rect.draw(line, 'black');
    }

    let border = s2d.rect.make(0, 0, width, height);
    s2d.rect.draw(border, 'black');
}

function main() {
    s2d.core.init(512, 512, null, init, update);
    console.log('Version 1');
}

setInterval(() => {
    let p = getPlayer();
    if (p) {
        notify('update', p);
    }
}, 5);