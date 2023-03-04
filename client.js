/*  Networking  */

const url = window.location.href;
const LOCAL = (url.includes('local') || url.includes('s2d')) ? true : false;
const serverAddress = LOCAL ? 'ws://localhost:9020' : 'wss://agile-temple-23495.herokuapp.com';

let server = null;
let connected = false;
let cid = 0;

/*  Client UI */

let width = 0;
let height = 0;
let screenCentre = 0;
let radius = 0;
let pos = {}
let buttons = {
	"down": {
        "pressed": false,
        "down": false,
    },
	"right": {
        "pressed": false,
        "down": false,
    },
	"up": {
        "pressed": false,
        "down": false,
    },
	"left": {
        "pressed": false,
        "down": false,
    }
}

function update_screen_values() {
    width = window.innerWidth;
    height = window.innerHeight;
    screenCentre = s2d.vec.make(width / 2, height / 2);
    radius = width / 4;
    if (height < width) {
        radius = height / 4;
    }
    s2d.canvas.resizeTo(width, height);

    s2d.sprite.scale('button cross', 1, 1);
    let unscaled_width = s2d.sprite.width('button cross');
    let upscale = Math.floor(radius / unscaled_width);
    if (upscale > 1) {
        s2d.sprite.scale('button cross', upscale, upscale);
        s2d.sprite.scale('button circle', upscale, upscale);
        s2d.sprite.scale('button triangle', upscale, upscale);
        s2d.sprite.scale('button square', upscale, upscale);
        s2d.sprite.scale('button square', upscale, upscale);
        s2d.sprite.scale('dc', upscale / 2, upscale / 2);
    }

    pos['down'] = s2d.vec.add(screenCentre, { x: 0, y: radius});
    pos['right'] = s2d.vec.add(screenCentre, { x: radius, y: 0});
    pos['up'] = s2d.vec.add(screenCentre, { x: 0, y: -radius});
    pos['left'] = s2d.vec.add(screenCentre, { x: -radius, y: 0});
}

function process_input() {
    connected = server.readyState === WebSocket.OPEN
    if (!connected) {
        return;
    }

    let clickPos = s2d.input.mousePosition();
    let buttonDown = s2d.input.mouseDown()

    let payload = {};
    let skip_notify = true;
    for (button in buttons) {

        let clickRadius = s2d.sprite.width('button cross') * 0.75; // const
        let inRange = s2d.vec.distance(pos[button], clickPos) < clickRadius;

        buttons[button].pressed = !buttons[button].down && inRange && buttonDown;
        buttons[button].down = inRange && buttonDown;

        if (buttons[button].pressed) {
            payload[button] = buttons[button];
            skip_notify = false;
        }
    }

    if (skip_notify) {
        return;
    }

    console.log(JSON.stringify(payload));
    notify('update', payload);
}

function draw_buttons() {
    s2d.sprite.draw('button cross', pos['down'].x, pos['down'].y, buttons['down'].down ? 1 : 0, true);
    s2d.sprite.draw('button circle', pos['right'].x, pos['right'].y, buttons['right'].down ? 1 : 0, true);
    s2d.sprite.draw('button triangle', pos['up'].x, pos['up'].y, buttons['up'].down ? 1 : 0, true);
    s2d.sprite.draw('button square', pos['left'].x, pos['left'].y, buttons['left'].down ? 1 : 0, true);
}

/* Client Data */

let lastNotifyTimestamp = {};
let notifyCooldowns = {
};

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
    }
}

function setup() {
    s2d.assets.loadSprite('button cross', './sprites/cross.png', 1, 2);
    s2d.assets.loadSprite('button circle', './sprites/circle.png', 1, 2);
    s2d.assets.loadSprite('button triangle', './sprites/triangle.png', 1, 2);
    s2d.assets.loadSprite('button square', './sprites/square.png', 1, 2);
    s2d.assets.loadSprite('dc', './sprites/ban.png', 1, 2);

    // Networking
    server = new WebSocket(serverAddress);
    server.onopen = () => {
        console.log(`Connected to server`);
        // if (window.location.href.includes('join')) {
        //     notify('join');
        // }
    }
    server.onmessage = message => parseServerData(JSON.parse(message.data));
}

function init() {
}

function update(dt) {
    update_screen_values()
    process_input()
    s2d.canvas.clear('ghostwhite');
    if (!connected) {
        let dc_radius = s2d.sprite.width('dc') / 2;
        s2d.sprite.draw('dc', dc_radius, dc_radius, 0)
    }
    draw_buttons()
}

function main() {
    s2d.core.init(512, 512, setup, init, update);
}