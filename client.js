const LOCAL = false;
const serverAddress = LOCAL ? 'ws://localhost:9021' : 'wss://agile-temple-23495.herokuapp.com';

let server = null;
let cid = 0;
let pid = 0;
let clicks = 0;

let screenCentre = s2d.vec.zero;
let serverOrigin = s2d.vec.zero;
let players = {};

function player() {
    return players[pid];
}

function notify(type, raw = {}) {
    server.send(JSON.stringify({type, raw}));
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
        if (s2d.input.mouseDown()) {
            let touchPosition = s2d.input.mousePosition();
            let side = touchPosition.x <= screenCentre.x ? 'left' : 'right';
            let p = player();
            p.position.x += 120 * dt * (side == 'left' ? - 1 : 1);
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