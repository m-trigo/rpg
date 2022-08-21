const LOCAL = false;
const serverAddress = LOCAL ? 'ws://localhost:9021' : 'wss://agile-temple-23495.herokuapp.com';

let server = null;
let cid = -1;

let screenCentre = s2d.vec.zero;
let serverOrigin = s2d.vec.zero;
let players = {};

function parseServerData(data) {
    if (data.type == 'cid') {
        cid = parseInt(data.raw);
        console.log(`Joined with id ${cid}`);
        server.send(JSON.stringify({
            cid,
            type: 'init',
            raw: ''
        }));
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

    if (cid == 0) {
        s2d.canvas.clear('#e1e1e1');
        for (const [pid, player] of Object.entries(players)) {
            let ppos = s2d.vec.add(serverOrigin, player.position);
            let rect = s2d.rect.make(ppos.x, ppos.y, ppos.x + 20, ppos.y + 40);
            s2d.rect.draw(rect, player.color);
        }
    }
    else {
        if (s2d.input.mouseDown()) {
            let touchPosition = s2d.input.mousePosition();
            let side = touchPosition.x <= screenCentre.x ? 'left' : 'right';
            server.send(JSON.stringify({
                cid,
                type: 'input',
                raw: side
            }));
        }
        s2d.canvas.clear('#424242');
        let line = s2d.rect.make(window.innerWidth/2 - 4, 0, window.innerWidth/2 + 4, window.innerHeight);
        s2d.rect.draw(line, '#e1e1e1');
    }
}

function main() {
    s2d.core.init(512, 512, () => {}, init, update);
}