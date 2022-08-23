/*
    ---------------- Simple2D ----------------
    A tiny JavaScript library for 2D games

    Released as free and open source software
    Do whatever you want with it
    Use at your own risk

    Written by Murilo Trigo (@MuriloTrigo)
*/

class s2d {

    static state = {

        core: {
            load: null,
            init: null,
            update: null,
        },

        time: {
            elapsed: 0,
            lastUpdate: null,
            frameSkipThreshold: 0.2,
            lastSecondTimestamps: [],
            fixedTimestep: false,
            fixedTimestepDt: 1 / 60
        },

        input: {
            raw: {
                mouse: {
                    x: 0,
                    y: 0,
                    pressed: false
                }
            },

            buttons: {
                up: { pressed: false, repeat: false, keys: ['Up', 'ArrowUp', 'W'] },
                left: { pressed: false, repeat: false, keys: ['Left', 'ArrowLeft', 'A'] },
                down: { pressed: false, repeat: false, keys: ['Down', 'ArrowDown', 'S'] },
                right: { pressed: false, repeat: false, keys: ['Right', 'ArrowRight', 'D'] },
                o: { pressed: false, repeat: false, keys: ['Enter', 'Spacebar', ' '] },
                x: { pressed: false, repeat: false, keys: ['Escape', 'Delete'] }
            },

            mouse: {
                position: { x: 0, y: 0 },
                pressed: false,
                repeat: false
            },

            timeToIdle: 0.5,
            idleTriggers: ['up', 'down', 'left', 'right', 'o', 'x'],
            maxTimeBetweenDoublePress: 0.4,
            maxTimeBetweenDoubleClick: 0.4,
            history: {
                buttons: [],
                mouse: []
            }
        },

        assets: {
            loadingPromises: [],
        },

        text: {
            fonts: {
                default: { family: 'Courier New', size: 16, weight: '' }
            },
            active: 'default',
            color: '#FFFFFF',
        },

        audio: {
            tracks: {}
        },

        sprite: {
            sheets: {}
        },

        anim: {
            definitions: {}
        },

        data: {
        },

        effects: {

            screenShake: {
                offset: { x: 0, y: 0 },
                amplitude: 1,
                decay: 1,
                intensity: 0,

                shake(intensity) {
                    this.intensity = Math.min(this.intensity + intensity, 1);
                },

                update(dt) {
                    if (this.intensity > 0) {
                        this.intensity = Math.max(this.intensity - dt * this.decay, 0);
                        this.offset.x = this.intensity * this.amplitude * (Math.random() * 2 - 1);
                        this.offset.y = this.intensity * this.amplitude * (Math.random() * 2 - 1);

                        if (this.offset.x != 0 || this.offset.y != 0) {
                            s2d.canvas.context().translate(this.offset.x, this.offset.y);
                        }
                    }
                }
            },

            screenFade: {
                color: '#000000',
                fadeTime: 1,
                fadeInComplete: false,
                fadeOutComplete: false,
                onFadeInComplete: null,
                onFadeOutComplete: null,
                elapsed: 0,

                isActive: function () {
                    return 0 < this.elapsed && this.elapsed <= this.fadeTime * 2;
                },

                start() {
                    this.elapsed = Number.EPSILON;
                    this.nextCallback = this.onFadeInComplete;
                    this.fadeInComplete = false;
                    this.fadeOutComplete = false;
                },

                update(dt) {
                    if (!this.isActive()) {
                        return;
                    }

                    this.elapsed += dt;
                    let progress = Math.min(this.elapsed / this.fadeTime, 2);
                    let opacity = progress;
                    if (opacity > 1) {
                        opacity = 2 - opacity;
                    }

                    let context = s2d.canvas.context();
                    context.save();
                    context.fillStyle = this.color;
                    context.globalAlpha = opacity;
                    context.fillRect(0, 0, s2d.canvas.width(), s2d.canvas.height());
                    context.restore();

                    if (progress >= 1 && !this.fadeInComplete) {
                        this.fadeInComplete = true;
                        if (this.onFadeInComplete) {
                            this.onFadeInComplete();
                        }
                    }

                    if (progress >= 2 && !this.fadeOutComplete) {
                        this.fadeOutComplete = true;
                        if (this.onFadeOutComplete) {
                            this.onFadeOutComplete();
                        }
                    }
                }
            }
        }
    };

    static core = {

        init(width, height, load, init, update) {

            /* Canvas Dimensions */
            s2d.canvas.element().width = width;
            s2d.canvas.element().style.width = width;
            s2d.canvas.element().height = height;
            s2d.canvas.element().style.height = height;

            /* Life Cycle Functions */
            s2d.state.core.load = load;
            s2d.state.core.init = init;
            s2d.state.core.update = update;

            /* Key Events */
            document.onkeydown = e => s2d.state.input.raw[e.key.toUpperCase()] = true;
            document.onkeyup = e => s2d.state.input.raw[e.key.toUpperCase()] = false;

            /* Mouse Events */
            s2d.canvas.element().onmousemove = e => {
                s2d.state.input.raw.mouse.x = e.clientX;
                s2d.state.input.raw.mouse.y = e.clientY;
            }
            s2d.canvas.element().onmousedown = e => {
                s2d.state.input.raw.mouse.x = e.clientX;
                s2d.state.input.raw.mouse.y = e.clientY;
                s2d.state.input.raw.mouse.pressed = true
            }
            s2d.canvas.element().onmouseup = e => {
                s2d.state.input.raw.mouse.x = e.clientX;
                s2d.state.input.raw.mouse.y = e.clientY;
                s2d.state.input.raw.mouse.pressed = false;
            }

            /* Touch Events */
            s2d.canvas.element().ontouchmove = e => {
                s2d.state.input.raw.mouse.x = e.changedTouches[0].clientX;
                s2d.state.input.raw.mouse.y = e.changedTouches[0].clientY;
            }
            s2d.canvas.element().ontouchstart = e => {
                s2d.state.input.raw.mouse.x = e.changedTouches[0].clientX;
                s2d.state.input.raw.mouse.y = e.changedTouches[0].clientY;
                s2d.state.input.raw.mouse.pressed = true
            }
            s2d.canvas.element().ontouchend = e => {
                s2d.state.input.raw.mouse.x = e.changedTouches[0].clientX;
                s2d.state.input.raw.mouse.y = e.changedTouches[0].clientY;
                s2d.state.input.raw.mouse.pressed = false
            }

            let frameLoop = () => {

                /* Button Inputs */
                for (let name in s2d.state.input.buttons) {
                    let button = s2d.state.input.buttons[name];
                    button.repeat = button.pressed;
                    button.pressed = false;
                    button.keys.forEach(key => {
                        if (Boolean(s2d.state.input.raw[key.toUpperCase()])) {
                            button.pressed = true;
                        }
                    });

                    if (button.pressed && !button.repeat) {
                        s2d.state.input.history.buttons.push({
                            name,
                            button,
                            when: s2d.time.elapsed()
                        });
                    }
                }

                /* Mouse Inputs */
                s2d.state.input.mouse.position = s2d.canvas.coord(s2d.state.input.raw.mouse.x, s2d.state.input.raw.mouse.y);
                s2d.state.input.mouse.repeat = s2d.state.input.mouse.pressed;
                s2d.state.input.mouse.pressed = s2d.state.input.raw.mouse.pressed;

                if (s2d.state.input.mouse.pressed && !s2d.state.input.mouse.repeat) {
                    s2d.state.input.history.mouse.push({
                        state: s2d.state.input.mouse,
                        when: s2d.time.elapsed()
                    });
                }

                /* Frame Data*/
                let now = new Date()
                let dt = (now - s2d.state.time.lastUpdate) / 1000;
                s2d.state.time.lastUpdate = now;
                if (s2d.state.time.frameSkipThreshold && dt > s2d.state.time.frameSkipThreshold) {
                    console.log(`Frame discarded: ${dt} seconds`);
                    dt = 0;
                }

                if (s2d.state.time.fixedTimestep) {
                    dt = s2d.state.time.fixedTimestepDt;
                }

                s2d.state.time.elapsed += dt;
                s2d.state.time.lastSecondTimestamps.push(now);
                s2d.state.time.lastSecondTimestamps = s2d.state.time.lastSecondTimestamps.filter(timestamp => now - timestamp < 1000);

                /* Update */
                s2d.canvas.context().save();
                s2d.state.core?.update?.(dt);
                s2d.canvas.context().restore();

                /* Next Frame Request */
                requestAnimationFrame(frameLoop);
            }

            /* Initialize */
            s2d.state.core?.load?.();

            Promise.allSettled(s2d.state.assets.loadingPromises).then(e => {
                s2d.state.data = s2d.data.deepCopy(__data__);
                s2d.canvas.clear();
                s2d.state.core?.init?.();
                s2d.state.time.lastUpdate = new Date();
                requestAnimationFrame(frameLoop);
            }).catch(e => console.log(e));
        }
    };

    static canvas = {

        element() {
            return document.getElementById('canvas')
        },

        context() {
            let context = this.element().getContext('2d');
            context.imageSmoothingEnabled = false;
            return context;
        },

        coord(x, y) {
            let rect = this.element().getBoundingClientRect();
            let xScale = this.element().width / rect.width;
            let yScale = this.element().height / rect.height;
            x = (x - rect.left) * xScale;
            y = (y - rect.top) * yScale;
            return { x, y };
        },

        width() {
            return this.element().width;
        },

        height() {
            return this.element().height;
        },

        clear(color = '#000000') {
            let context = s2d.canvas.context();
            context.fillStyle = color;
            context.fillRect(0, 0, s2d.canvas.width(), s2d.canvas.height());
        },

        resizeTo(newWidth, newHeight) {
            s2d.canvas.element().width = newWidth;
            s2d.canvas.element().style.width = newWidth;
            s2d.canvas.element().height = newHeight;
            s2d.canvas.element().style.height = newHeight;
        }
    };

    static time = {

        elapsed() {
            return s2d.state.time.elapsed;
        },

        setFrameSkipThreshold(dt) {
            s2d.state.time.frameSkipThreshold = dt;
        }
    };

    static input = {

        registerButton(name, keys) {
            s2d.state.input.buttons[name] = { pressed: false, repeat: false, keys };
        },

        setMaxTimeBetweenDoublePress(seconds) {
            s2d.state.input.maxTimeBetweenDoublePress = seconds;
        },

        setMaxTimeBetweenDoubleClick(seconds) {
            s2d.state.input.maxTimeBetweenDoubleClick = seconds;
        },

        isIdle() {
            let now = s2d.time.elapsed();
            let history = s2d.state.input.history.buttons;
            let i = history.length - 1;
            while (i >= 0) {
                let input = history[i];
                if (!s2d.state.input.idleTriggers.includes(input.name)) {
                    continue;
                }

                if (s2d.input.buttonDown(input.name)) {
                    return false;
                }

                let timeSinceInput = now - input.when;
                if (timeSinceInput < s2d.state.input.timeToIdle) {
                    return false;
                }

                i--;
            }

            return true;
        },

        setTimeToIdle(seconds) {
            s2d.state.input.timeToIdle = seconds;
        },

        setIdleTriggers(buttons) {
            s2d.state.input.idleTriggers = buttons
        },

        buttonPressed(name) {
            return s2d.state.input.buttons[name].pressed && !s2d.state.input.buttons[name].repeat;
        },

        buttonDown(name) {
            return s2d.state.input.buttons[name].pressed;
        },

        buttonRepeat(name) {
            return s2d.state.input.buttons[name].pressed && s2d.state.input.buttons[name].repeat;
        },

        buttonReleased(name) {
            return !s2d.state.input.buttons[name].pressed && s2d.state.input.buttons[name].repeat;
        },

        buttonPressedTwice(name) {
            let history = s2d.state.input.history.buttons;
            let historyLength = history.length;
            if (historyLength < 2) {
                return false;
            }

            let currentPress = history[historyLength - 1];
            let lastPress = history[historyLength - 2];
            if (currentPress.name != name || lastPress.name != name) {
                return false;
            }

            let current = currentPress.when;
            let last = lastPress.when;
            return current - last < s2d.state.input.maxTimeBetweenDoublePress;
        },

        mousePosition() {
            return {
                x: s2d.state.input.mouse.position.x,
                y: s2d.state.input.mouse.position.y
            };
        },

        mousePressed() {
            return s2d.state.input.mouse.pressed && !s2d.state.input.mouse.repeat
        },

        mouseDown() {
            return s2d.state.input.mouse.pressed;
        },

        mouseRepeat() {
            return s2d.state.input.mouse.pressed && s2d.state.input.mouse.repeat
        },

        mouseReleased() {
            if (!s2d.state.input.mouse.pressed) {
                console.log(s2d.state.input.mouse.repeat);
            }
            return !s2d.state.input.mouse.pressed && s2d.state.input.mouse.repeat;
        },

        mousePressedTwice() {
            let history = s2d.state.input.history.mouse;
            let historyLength = history.length;
            if (historyLength < 2) {
                return false;
            }

            let current = history[historyLength - 1].when;
            let last = history[historyLength - 2].when;
            return current - last < s2d.state.input.maxTimeBetweenDoubleClick;;
        }
    };

    static assets = {

        loadFontFamily(family, src) {
            var font = new FontFace(family, `url(${src})`);
            let promise = font.load().then(loaded => {
                document.fonts.add(loaded);
            }).catch(e => console.log(e));

            s2d.state.assets.loadingPromises.push(promise);
        },

        loadAudio(name, src) {
            let track = new Audio(src);
            track.start = function () {
                this.load();
                this.oncanplaythrough = () => {
                    this.play();
                    this.oncanplaythrough = null;
                }
            }

            let promise = new Promise(resolve => track.oncanplaythrough = resolve);

            s2d.state.audio.tracks[name] = track;
            s2d.state.assets.loadingPromises.push(promise);
        },

        loadSprite(name, src, rows, cols, scale = 1) {
            let sprite = {
                src,
                rows,
                cols,
                scale: { x: scale, y: scale },
                opacity: 1,
                image: new Image()
            };

            let promise = new Promise((resolve, reject) => {
                sprite.image.onload = resolve;
                sprite.image.onerror = reject;
                sprite.image.src = sprite.src;
            });

            s2d.state.sprite.sheets[name] = sprite;
            s2d.state.assets.loadingPromises.push(promise);
        }
    };

    static text = {

        registerFont(name, family, size, weight) {
            s2d.state.text.fonts[name] = { family, size, weight }
        },

        useFont(name, color) {
            s2d.state.text.color = color;
            s2d.state.text.active = name;
        },

        print(text, x, y) {
            let context = s2d.canvas.context();
            let font = s2d.state.text.fonts[s2d.state.text.active];
            context.save();
            context.font = `${font.weight} ${font.size}px ${font.family}`;
            context.textBaseline = 'top';
            context.fillStyle = s2d.state.text.color;
            context.fillText(text, x, y);
            context.restore();
        }
    };

    static audio = {

        start(name) {
            s2d.state.audio.tracks[name].start();
        },

        pause(name) {
            s2d.state.audio.tracks[name].pause();
        },

        play(name) {
            s2d.state.audio.tracks[name].play();
        }
    };

    static sprite = {

        opacity(name, opacity) {
            s2d.state.sprite.sheets[name].opacity = opacity;
        },

        scale(name, x, y) {
            s2d.state.sprite.sheets[name].scale.x = x;
            s2d.state.sprite.sheets[name].scale.y = y;
        },

        frameCount(name) {
            return s2d.state.sprite.sheets[name].cols * s2d.state.sprite.sheets[name].rows;
        },

        draw(name, x, y, index = 0) {
            let sprite = s2d.state.sprite.sheets[name];
            let row = Math.floor(index / sprite.cols);
            let col = index % sprite.cols;
            let width = sprite.image.width / sprite.cols;
            let height = sprite.image.height / sprite.rows;
            let sx = col * width;
            let sy = row * height;
            let dWidth = width;
            let dHeight = height;

            if (sprite.scale.x < 0) {
                dWidth *= -1;
            }
            if (sprite.scale.y < 0) {
                dHeight *= -1;
            }
            x = x / sprite.scale.x;
            y = y / sprite.scale.y;

            let context = s2d.canvas.context();
            context.save();
            context.globalAlpha = sprite.opacity;
            context.scale(sprite.scale.x, sprite.scale.y);
            context.drawImage(sprite.image, sx, sy, width, height, x, y, dWidth, dHeight);
            context.restore();
        }
    };

    static anim = {

        defineAnimation(name, sprite, params = {}) {

            let {
                runtime = 1,
                speeds = [
                    { index: 0, speed: 1 },
                ],
                scale = { x: 1, y: 1 }
            } = params;

            s2d.state.anim.definitions[name] = (overrides = {}) => {

                let {
                    runtimeOverride,
                    speedsOverride,
                    scaleOverride
                } = overrides;

                runtime = runtimeOverride ?? runtime;
                speeds = speedsOverride ?? speeds;
                scale = scaleOverride ?? scale;

                let frameIndex = 0;
                let frameCount = s2d.sprite.frameCount(sprite);
                let frameRuntime = runtime / frameCount;
                let frameSpeed = speeds[0].speed;
                let elapsedOnFrame = 0;

                return (dt, x, y) => {
                    this.name = name;

                    elapsedOnFrame += dt;

                    let speedChange = speeds.find(e => e.index == frameIndex);
                    if (speedChange) {
                        frameSpeed = speedChange.speed;
                    }

                    if (elapsedOnFrame > frameRuntime / frameSpeed) {

                        elapsedOnFrame = elapsedOnFrame % frameRuntime;
                        frameIndex++;

                        if (frameIndex == frameCount) {
                            frameIndex = 0;
                        }
                    }

                    s2d.sprite.scale(sprite, scale.x, scale.y);
                    s2d.sprite.draw(sprite, x, y, frameIndex);
                }
            };
        },

        createAnimation(name, overrides) {
            return s2d.state.anim.definitions[name](overrides);
        },
    };

    static data = {
        
        read(name) {
            return s2d.data.deepCopy(s2d.state.data[name]);
        },

        write(name, value) {
            s2d.state.data[name] = s2d.data.deepCopy(value);
        },

        download(filename = 'data.js') {
            s2d.system.download(filename, "let __data__ = " + JSON.stringify(s2d.state.data, null, 4));
        },

        deepCopy(object) {
            return JSON.parse(JSON.stringify(object));
        }
    };

    static vec = {

        make(x, y) {
            return { x, y };
        },

        equals(u, v) {
            let xEquals = Math.abs(u.x - v.x) < Number.EPSILON;
            let yEquals = Math.abs(u.y - v.y) < Number.EPSILON;
            return xEquals && yEquals;
        },

        add(u, v) {
            let x = u.x + v.x;
            let y = u.y + v.y;
            return this.make(x, y);
        },

        mult(v, scalar) {
            this.make(v.x * scalar, v.y * scalar);
        },

        sub(u, v) {
            return this.add(u, this.mult(v, -1));
        },

        div(v, scalar) {
            return this.mult(v, 1 / scalar);
        },

        draw(v, color = '#FF77A8') {
            let context = s2d.canvas.context();
            context.save();
            context.fillStyle = color;
            context.fillRect(v.x, v.y, 4, 4);
            context.restore();
        },

        toString(v) {
            return `(${v.x}, ${v.y})`;
        },

        get zero() {
            return s2d.vec.make(0, 0);
        },

        get one() {
            return s2d.vec.make(1, 1);
        },

        get left() {
            return s2d.vec.make(-1, 0);
        },

        get right() {
            return s2d.vec.make(1, 0);
        },

        get up() {
            return s2d.vec.make(0, -1);
        },

        get down() {
            return s2d.vec.make(0, 1);
        },
    };

    static rect = {

        make(sx, sy, ex, ey) {
            return {
                start: { x: sx, y: sy },
                end: { x: ex, y: ey }
            };
        },

        width(rect) {
            return Math.abs(rect.start.x - rect.end.x);
        },

        height(rect) {
            return Math.abs(rect.start.y - rect.end.y);
        },

        xMin(rect) {
            return Math.min(rect.start.x, rect.end.x);
        },

        xMax(rect) {
            return Math.max(rect.start.x, rect.end.x);
        },

        yMin(rect) {
            return Math.min(rect.start.y, rect.end.y);
        },

        yMax(rect) {
            return Math.max(rect.start.y, rect.end.y);
        },

        contains(rect, vec) {
            let xContains = this.xMin(rect) <= vec.x && vec.x <= this.xMax(rect);
            let yContains = this.yMin(rect) <= vec.y && vec.y <= this.yMax(rect);
            return xContains && yContains;
        },

        draw(rect, color = '#FF77A8') {
            let context = s2d.canvas.context();
            context.save();
            context.fillStyle = color;

            let xMin = this.xMin(rect);
            let yMin = this.yMin(rect);
            let width = this.width(rect);
            let height = this.height(rect);

            // Top
            context.fillRect(xMin, yMin, width, 4);
            // Bottom
            context.fillRect(xMin, yMin + height - 4, width, 4);
            // Left
            context.fillRect(xMin, yMin, 4, height);
            // Right
            context.fillRect(xMin + width - 4, yMin, 4, height);

            context.restore();
        },

        toString(rect) {
            return `start: ${s2d.vec.toString(rect.start)}, end: ${s2d.vec.toString(rect.end)}`;
        }
    };

    static effects = {

        shakeScreen(amplitude = 1, decay = 1, intensityIncrease = 1) {
            s2d.state.effects.screenShake.amplitude = amplitude;
            s2d.state.effects.screenShake.decay = decay;
            s2d.state.effects.screenShake.shake(intensityIncrease);
        },

        updateScreenShake(dt) {
            s2d.state.effects.screenShake.update(dt);
            if (s2d.state.effects.screenShake.offset.x != 0 || s2d.state.effects.screenShake.offset.y != 0) {
                s2d.canvas.context().translate(s2d.state.effects.screenShake.offset.x, s2d.state.effects.screenShake.offset.y);
            }
        },

        fadeScreen(color, fadeTime, fadeInCallback, fadeOutCallback) {
            s2d.state.effects.screenFade.color = color;
            s2d.state.effects.screenFade.fadeTime = fadeTime;
            s2d.state.effects.screenFade.onFadeInComplete = fadeInCallback;
            s2d.state.effects.screenFade.onFadeOutComplete = fadeOutCallback;
            s2d.state.effects.screenFade.start();
        },

        updateScreenFade(dt) {
            s2d.state.effects.screenFade.update(dt);
        }
    };

    static debug = {

        fixedTimestep(enable) {
            s2d.state.time.fixedTimestep = enable;
        },

        drawFps(x, y) {
            s2d.text.print(s2d.state.time.lastSecondTimestamps.length, x, y)
        },

        drawPixelGrid(size, color) {

            if (!size) {
                return;
            }

            let context = s2d.canvas.context();

            context.save();

            context.fillStyle = color;
            context.globalAlpha = 0.5;

            for (let x = 0; x < s2d.canvas.width(); x += size) {
                context.fillRect(x, 0, 1, s2d.canvas.height());
            }

            for (let y = 0; y < s2d.canvas.height(); y += size) {
                context.fillRect(0, y, s2d.canvas.width(), 1);
            }

            context.restore();
        }
    };

    static system = {

        download(filename, content) {
            var element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
    };
};