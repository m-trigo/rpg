const LOCAL = false;
const serverAddress = LOCAL ? 'ws://localhost:9021' : 'wss://agile-temple-23495.herokuapp.com';

let server = null;
let cid = 0;
let pid = 0;
let clicks = 0;

let screenCentre = s2d.vec.zero;
let serverOrigin = s2d.vec.zero;
let players = {};

function getPlayer(playerId = pid) {
    return players[playerId];
}

let lastNotifyTimestamp = {};
let notifyCooldowns = {
    'update': 0.1,
    'offscreen': 1
}

function notify(type, raw = {}) {
    let now = s2d.time.elapsed();

    if (notifyCooldowns[type] && lastNotifyTimestamp[type]) {
        if (now - lastNotifyTimestamp[type] < notifyCooldowns[type]) {
            //console.log(`Notify skipped (${type})`);
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
        notify('init');
    }

    if (data.type == 'pid') {
        pid = parseInt(data.raw);
        console.log(`Joined as player with id ${cid}`);
    }

    if (data.type == 'update') {
        players = data.raw;
    }
}

function init() {
    s2d.canvas.resizeTo(window.innerWidth, window.innerHeight);
    screenCentre = s2d.vec.make(s2d.canvas.width() / 2, s2d.canvas.height() / 2);
    serverOrigin = screenCentre;

    server = new WebSocket(serverAddress);
    server.onopen = () => console.log(`Connected to server`);
    server.onmessage = message => parseServerData(JSON.parse(message.data));
}

function update(dt) {

    if (pid == 0) {
        s2d.canvas.clear('#e1e1e1');
        for (const [pid, player] of Object.entries(players)) {
            let ppos = s2d.vec.add(serverOrigin, player.position);
            let rect = s2d.rect.make(ppos.x, ppos.y, ppos.x + 20, ppos.y + 40);
            s2d.rect.draw(rect, player.color);
        }

        if (s2d.input.mousePressed() && clicks < 3) {
            clicks++;
            if (clicks > 2 ) {
                notify('join');
            }
        }
    }
    else {

        let p = getPlayer();
        let dirty = false;

        if (p && s2d.input.mouseDown()) {
            let touchPosition = s2d.input.mousePosition();
            let side = touchPosition.x <= screenCentre.x ? 'left' : 'right';
            p.position.x += 300 * dt * (side == 'left' ? - 1 : 1);
            dirty = true;
        }

        if (dirty) {
            notify('update', p);
        }

        s2d.canvas.clear('#424242');
        let line = s2d.rect.make(window.innerWidth/2 - 4, 0, window.innerWidth/2 + 4, window.innerHeight);
        s2d.rect.draw(line, '#e1e1e1');
    }
}

function main() {
    s2d.core.init(512, 512, () => {}, init, update);
}