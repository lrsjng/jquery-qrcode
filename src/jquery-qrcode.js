const WIN = window; // eslint-disable-line
const JQ = WIN.jQuery;

const is_img_el = x => x && typeof x.tagName === 'string' && x.tagName.toUpperCase() === 'IMG';

// Wrapper for the original QR code generator.
const create_qrcode = (text, level, version, quiet) => {
    const qr = {};

    const qr_gen = require('qrcode-generator');
    qr_gen.stringToBytes = qr_gen.stringToBytesFuncs['UTF-8'];
    const vqr = qr_gen(version, level);
    vqr.addData(text);
    vqr.make();

    quiet = quiet || 0;

    const module_count = vqr.getModuleCount();
    const quiet_module_count = module_count + 2 * quiet;

    const is_dark = (row, col) => {
        row -= quiet;
        col -= quiet;
        return row >= 0 && row < module_count && col >= 0 && col < module_count && vqr.isDark(row, col);
    };

    const add_blank = (l, t, r, b) => {
        const prev_is_dark = qr.is_dark;
        const module_size = 1 / quiet_module_count;

        qr.is_dark = (row, col) => {
            const ml = col * module_size;
            const mt = row * module_size;
            const mr = ml + module_size;
            const mb = mt + module_size;
            return prev_is_dark(row, col) && (l > mr || ml > r || t > mb || mt > b);
        };
    };

    qr.text = text;
    qr.level = level;
    qr.version = version;
    qr.module_count = quiet_module_count;
    qr.is_dark = is_dark;
    qr.add_blank = add_blank;

    return qr;
};

// Returns a minimal QR code for the given text starting with version `min_ver`.
// Returns `undefined` if `text` is too long to be encoded in `max_ver`.
const create_min_qrcode = (text, level, min_ver, max_ver, quiet) => {
    min_ver = Math.max(1, min_ver || 1);
    max_ver = Math.min(40, max_ver || 40);
    for (let ver = min_ver; ver <= max_ver; ver += 1) {
        try {
            return create_qrcode(text, level, ver, quiet);
        } catch (err) {/* empty */}
    }
    return undefined;
};

const draw_background_label = (qr, ctx, settings) => {
    const size = settings.size;
    const font = 'bold ' + settings.mSize * size + 'px ' + settings.fontname;
    const tmp_ctx = JQ('<canvas/>')[0].getContext('2d');

    tmp_ctx.font = font;

    const w = tmp_ctx.measureText(settings.label).width;
    const sh = settings.mSize;
    const sw = w / size;
    const sl = (1 - sw) * settings.mPosX;
    const st = (1 - sh) * settings.mPosY;
    const sr = sl + sw;
    const sb = st + sh;
    const pad = 0.01;

    if (settings.mode === 1) {
        // Strip
        qr.add_blank(0, st - pad, size, sb + pad);
    } else {
        // Box
        qr.add_blank(sl - pad, st - pad, sr + pad, sb + pad);
    }

    ctx.fillStyle = settings.fontcolor;
    ctx.font = font;
    ctx.fillText(settings.label, sl * size, st * size + 0.75 * settings.mSize * size);
};

const draw_background_img = (qr, ctx, settings) => {
    const size = settings.size;
    const w = settings.image.naturalWidth || 1;
    const h = settings.image.naturalHeight || 1;
    const sh = settings.mSize;
    const sw = sh * w / h;
    const sl = (1 - sw) * settings.mPosX;
    const st = (1 - sh) * settings.mPosY;
    const sr = sl + sw;
    const sb = st + sh;
    const pad = 0.01;

    if (settings.mode === 3) {
        // Strip
        qr.add_blank(0, st - pad, size, sb + pad);
    } else {
        // Box
        qr.add_blank(sl - pad, st - pad, sr + pad, sb + pad);
    }

    ctx.drawImage(settings.image, sl * size, st * size, sw * size, sh * size);
};

const draw_background = (qr, ctx, settings) => {
    if (is_img_el(settings.background)) {
        ctx.drawImage(settings.background, 0, 0, settings.size, settings.size);
    } else if (settings.background) {
        ctx.fillStyle = settings.background;
        ctx.fillRect(settings.left, settings.top, settings.size, settings.size);
    }

    const mode = settings.mode;
    if (mode === 1 || mode === 2) {
        draw_background_label(qr, ctx, settings);
    } else if (is_img_el(settings.image) && (mode === 3 || mode === 4)) {
        draw_background_img(qr, ctx, settings);
    }
};

const draw_modules_default = (qr, ctx, settings, left, top, width, row, col) => {
    if (qr.is_dark(row, col)) {
        ctx.r(left, top, width, width);
    }
};

const draw_modules_rounded_dark = (ctx, l, t, r, b, rad, nw, ne, se, sw) => {
    if (nw) {
        ctx.m(l + rad, t);
    } else {
        ctx.m(l, t);
    }

    if (ne) {
        ctx.l(r - rad, t).a(r, t, r, b, rad);
    } else {
        ctx.l(r, t);
    }

    if (se) {
        ctx.l(r, b - rad).a(r, b, l, b, rad);
    } else {
        ctx.l(r, b);
    }

    if (sw) {
        ctx.l(l + rad, b).a(l, b, l, t, rad);
    } else {
        ctx.l(l, b);
    }

    if (nw) {
        ctx.l(l, t + rad).a(l, t, r, t, rad);
    } else {
        ctx.l(l, t);
    }
};

const draw_modules_rounded_light = (ctx, l, t, r, b, rad, nw, ne, se, sw) => {
    if (nw) {
        ctx.m(l + rad, t).l(l, t).l(l, t + rad).a(l, t, l + rad, t, rad);
    }

    if (ne) {
        ctx.m(r - rad, t).l(r, t).l(r, t + rad).a(r, t, r - rad, t, rad);
    }

    if (se) {
        ctx.m(r - rad, b).l(r, b).l(r, b - rad).a(r, b, r - rad, b, rad);
    }

    if (sw) {
        ctx.m(l + rad, b).l(l, b).l(l, b - rad).a(l, b, l + rad, b, rad);
    }
};

const draw_modules_rounded = (qr, ctx, settings, left, top, width, row, col) => {
    const right = left + width;
    const bottom = top + width;
    const rad = settings.radius * width;

    const row_n = row - 1;
    const row_s = row + 1;
    const col_w = col - 1;
    const col_e = col + 1;

    const is_dark = qr.is_dark;
    const d_center = is_dark(row, col);
    const d_nw = is_dark(row_n, col_w);
    const d_n = is_dark(row_n, col);
    const d_ne = is_dark(row_n, col_e);
    const d_e = is_dark(row, col_e);
    const d_se = is_dark(row_s, col_e);
    const d_s = is_dark(row_s, col);
    const d_sw = is_dark(row_s, col_w);
    const d_w = is_dark(row, col_w);

    if (d_center) {
        draw_modules_rounded_dark(ctx, left, top, right, bottom, rad, !d_n && !d_w, !d_n && !d_e, !d_s && !d_e, !d_s && !d_w);
    } else {
        draw_modules_rounded_light(ctx, left, top, right, bottom, rad, d_n && d_w && d_nw, d_n && d_e && d_ne, d_s && d_e && d_se, d_s && d_w && d_sw);
    }
};

const draw_modules = (qr, ctx, settings) => {
    const module_count = qr.module_count;
    const module_size = settings.size / module_count;

    let fn = draw_modules_default;
    if (settings.radius > 0 && settings.radius <= 0.5) {
        fn = draw_modules_rounded;
    }

    const draw_ctx = {
        m(x, y) {ctx.moveTo(x, y); return draw_ctx;},
        l(x, y) {ctx.lineTo(x, y); return draw_ctx;},
        a(...args) {ctx.arcTo(...args); return draw_ctx;},
        r(...args) {ctx.rect(...args); return draw_ctx;}
    };

    ctx.beginPath();
    for (let row = 0; row < module_count; row += 1) {
        for (let col = 0; col < module_count; col += 1) {
            const l = settings.left + col * module_size;
            const t = settings.top + row * module_size;
            const w = module_size;

            fn(qr, draw_ctx, settings, l, t, w, row, col);
        }
    }
    if (is_img_el(settings.fill)) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        const prev = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = prev;

        ctx.clip();
        ctx.drawImage(settings.fill, 0, 0, settings.size, settings.size);
        ctx.restore();
    } else {
        ctx.fillStyle = settings.fill;
        ctx.fill();
    }
};

// Draws QR code to the given `canvas` and returns it.
const draw_on_canvas = (canvas, settings) => {
    const qr = create_min_qrcode(settings.text, settings.ecLevel, settings.minVersion, settings.maxVersion, settings.quiet);
    if (!qr) {
        return null;
    }

    const $canvas = JQ(canvas).data('qrcode', qr);
    const ctx = $canvas[0].getContext('2d');

    draw_background(qr, ctx, settings);
    draw_modules(qr, ctx, settings);

    return $canvas;
};

// Returns a `canvas` element representing the QR code for the given settings.
const create_canvas = settings => {
    const $canvas = JQ('<canvas/>').attr('width', settings.size).attr('height', settings.size);
    return draw_on_canvas($canvas, settings);
};

// Returns an `image` element representing the QR code for the given settings.
const create_img = settings => {
    return JQ('<img/>').attr('src', create_canvas(settings)[0].toDataURL('image/png'));
};

// Returns a `div` element representing the QR code for the given settings.
const create_div = settings => {
    const qr = create_min_qrcode(settings.text, settings.ecLevel, settings.minVersion, settings.maxVersion, settings.quiet);
    if (!qr) {
        return null;
    }

    // some shortcuts to improve compression
    const settings_size = settings.size;
    const settings_bgColor = settings.background;
    const math_floor = Math.floor;

    const module_count = qr.module_count;
    const module_size = math_floor(settings_size / module_count);
    const offset = math_floor(0.5 * (settings_size - module_size * module_count));

    const container_css = {
        position: 'relative',
        left: 0,
        top: 0,
        padding: 0,
        margin: 0,
        width: settings_size,
        height: settings_size
    };
    const dark_css = {
        position: 'absolute',
        padding: 0,
        margin: 0,
        width: module_size,
        height: module_size,
        'background-color': settings.fill
    };

    const $div = JQ('<div/>').data('qrcode', qr).css(container_css);

    if (settings_bgColor) {
        $div.css('background-color', settings_bgColor);
    }

    for (let row = 0; row < module_count; row += 1) {
        for (let col = 0; col < module_count; col += 1) {
            if (qr.is_dark(row, col)) {
                JQ('<div/>')
                    .css(dark_css)
                    .css({
                        left: offset + col * module_size,
                        top: offset + row * module_size
                    })
                    .appendTo($div);
            }
        }
    }

    return $div;
};

const create_html = settings => {
    if (settings.render === 'canvas') {
        return create_canvas(settings);
    } else if (settings.render === 'image') {
        return create_img(settings);
    }

    return create_div(settings);
};

const DEFAULTS = {
    // render method: `'canvas'`, `'image'` or `'div'`
    render: 'canvas',

    // version range somewhere in 1 .. 40
    minVersion: 1,
    maxVersion: 40,

    // error correction level: `'L'`, `'M'`, `'Q'` or `'H'`
    ecLevel: 'L',

    // offset in pixel if drawn onto existing canvas
    left: 0,
    top: 0,

    // size in pixel
    size: 200,

    // code color or image element
    fill: '#000',

    // background color or image element, `null` for transparent background
    background: '#fff',

    // content
    text: 'no text',

    // corner radius relative to module width: 0.0 .. 0.5
    radius: 0,

    // quiet zone in modules
    quiet: 0,

    // modes
    // 0: normal
    // 1: label strip
    // 2: label box
    // 3: image strip
    // 4: image box
    mode: 0,

    mSize: 0.1,
    mPosX: 0.5,
    mPosY: 0.5,

    label: 'no label',
    fontname: 'sans',
    fontcolor: '#000',

    image: null
};

JQ.fn.qrcode = module.exports = function main(options) {
    const settings = JQ.extend({}, DEFAULTS, options);

    return this.each((idx, el) => {
        if (el.nodeName.toLowerCase() === 'canvas') {
            draw_on_canvas(el, settings);
        } else {
            JQ(el).append(create_html(settings));
        }
    });
};
