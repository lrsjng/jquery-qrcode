(function (vendor_qrcode) {
    'use strict';

    var jq = window.jQuery;

    // Check if canvas is available in the browser (as Modernizr does)
    var hasCanvas = (function () {
        var elem = document.createElement('canvas');
        return !!(elem.getContext && elem.getContext('2d'));
    }());

    // Wrapper for the original QR code generator.
    function createQRCode(text, level, version, quiet) {
        var qr = {};

        var vqr = vendor_qrcode(version, level);
        vqr.addData(text);
        vqr.make();

        quiet = quiet || 0;

        var qrModuleCount = vqr.getModuleCount();
        var quietModuleCount = vqr.getModuleCount() + 2 * quiet;

        function isDark(row, col) {
            row -= quiet;
            col -= quiet;

            if (row < 0 || row >= qrModuleCount || col < 0 || col >= qrModuleCount) {
                return false;
            }
            return vqr.isDark(row, col);
        }

        function addBlank(l, t, r, b) {
            var prevIsDark = qr.isDark;
            var moduleSize = 1 / quietModuleCount;

            qr.isDark = function (row, col) {
                var ml = col * moduleSize;
                var mt = row * moduleSize;
                var mr = ml + moduleSize;
                var mb = mt + moduleSize;

                return prevIsDark(row, col) && (l > mr || ml > r || t > mb || mt > b);
            };
        }

        qr.text = text;
        qr.level = level;
        qr.version = version;
        qr.moduleCount = quietModuleCount;
        qr.isDark = isDark;
        qr.addBlank = addBlank;

        return qr;
    }

    // Returns a minimal QR code for the given text starting with version `minVersion`.
    // Returns `undefined` if `text` is too long to be encoded in `maxVersion`.
    function createMinQRCode(text, level, minVersion, maxVersion, quiet) {
        minVersion = Math.max(1, minVersion || 1);
        maxVersion = Math.min(40, maxVersion || 40);
        for (var version = minVersion; version <= maxVersion; version += 1) {
            try {
                return createQRCode(text, level, version, quiet);
            } catch (err) {/* empty */}
        }
        return undefined;
    }

    function drawBackgroundLabel(qr, context, settings) {
        var size = settings.size;
        var font = 'bold ' + settings.mSize * size + 'px ' + settings.fontname;
        var ctx = jq('<canvas/>')[0].getContext('2d');

        ctx.font = font;

        var w = ctx.measureText(settings.label).width;
        var sh = settings.mSize;
        var sw = w / size;
        var sl = (1 - sw) * settings.mPosX;
        var st = (1 - sh) * settings.mPosY;
        var sr = sl + sw;
        var sb = st + sh;
        var pad = 0.01;

        if (settings.mode === 1) {
            // Strip
            qr.addBlank(0, st - pad, size, sb + pad);
        } else {
            // Box
            qr.addBlank(sl - pad, st - pad, sr + pad, sb + pad);
        }

        context.fillStyle = settings.fontcolor;
        context.font = font;
        context.fillText(settings.label, sl * size, st * size + 0.75 * settings.mSize * size);
    }

    function drawBackgroundImage(qr, context, settings) {
        var size = settings.size;
        var w = settings.image.naturalWidth || 1;
        var h = settings.image.naturalHeight || 1;
        var sh = settings.mSize;
        var sw = sh * w / h;
        var sl = (1 - sw) * settings.mPosX;
        var st = (1 - sh) * settings.mPosY;
        var sr = sl + sw;
        var sb = st + sh;
        var pad = 0.01;

        if (settings.mode === 3) {
            // Strip
            qr.addBlank(0, st - pad, size, sb + pad);
        } else {
            // Box
            qr.addBlank(sl - pad, st - pad, sr + pad, sb + pad);
        }

        context.drawImage(settings.image, sl * size, st * size, sw * size, sh * size);
    }

    function drawBackground(qr, context, settings) {
        if (jq(settings.background).is('img')) {
            context.drawImage(settings.background, 0, 0, settings.size, settings.size);
        } else if (settings.background) {
            context.fillStyle = settings.background;
            context.fillRect(settings.left, settings.top, settings.size, settings.size);
        }

        var mode = settings.mode;
        if (mode === 1 || mode === 2) {
            drawBackgroundLabel(qr, context, settings);
        } else if (mode === 3 || mode === 4) {
            drawBackgroundImage(qr, context, settings);
        }
    }

    function drawModuleDefault(qr, context, settings, left, top, width, row, col) {
        if (qr.isDark(row, col)) {
            context.rect(left, top, width, width);
        }
    }

    function drawModuleRoundedDark(ctx, l, t, r, b, rad, nw, ne, se, sw) {
        if (nw) {
            ctx.moveTo(l + rad, t);
        } else {
            ctx.moveTo(l, t);
        }

        if (ne) {
            ctx.lineTo(r - rad, t);
            ctx.arcTo(r, t, r, b, rad);
        } else {
            ctx.lineTo(r, t);
        }

        if (se) {
            ctx.lineTo(r, b - rad);
            ctx.arcTo(r, b, l, b, rad);
        } else {
            ctx.lineTo(r, b);
        }

        if (sw) {
            ctx.lineTo(l + rad, b);
            ctx.arcTo(l, b, l, t, rad);
        } else {
            ctx.lineTo(l, b);
        }

        if (nw) {
            ctx.lineTo(l, t + rad);
            ctx.arcTo(l, t, r, t, rad);
        } else {
            ctx.lineTo(l, t);
        }
    }

    function drawModuleRoundendLight(ctx, l, t, r, b, rad, nw, ne, se, sw) {
        if (nw) {
            ctx.moveTo(l + rad, t);
            ctx.lineTo(l, t);
            ctx.lineTo(l, t + rad);
            ctx.arcTo(l, t, l + rad, t, rad);
        }

        if (ne) {
            ctx.moveTo(r - rad, t);
            ctx.lineTo(r, t);
            ctx.lineTo(r, t + rad);
            ctx.arcTo(r, t, r - rad, t, rad);
        }

        if (se) {
            ctx.moveTo(r - rad, b);
            ctx.lineTo(r, b);
            ctx.lineTo(r, b - rad);
            ctx.arcTo(r, b, r - rad, b, rad);
        }

        if (sw) {
            ctx.moveTo(l + rad, b);
            ctx.lineTo(l, b);
            ctx.lineTo(l, b - rad);
            ctx.arcTo(l, b, l + rad, b, rad);
        }
    }

    function drawModuleRounded(qr, context, settings, left, top, width, row, col) {
        var isDark = qr.isDark;
        var right = left + width;
        var bottom = top + width;
        var radius = settings.radius * width;
        var rowT = row - 1;
        var rowB = row + 1;
        var colL = col - 1;
        var colR = col + 1;
        var center = isDark(row, col);
        var northwest = isDark(rowT, colL);
        var north = isDark(rowT, col);
        var northeast = isDark(rowT, colR);
        var east = isDark(row, colR);
        var southeast = isDark(rowB, colR);
        var south = isDark(rowB, col);
        var southwest = isDark(rowB, colL);
        var west = isDark(row, colL);

        if (center) {
            drawModuleRoundedDark(context, left, top, right, bottom, radius, !north && !west, !north && !east, !south && !east, !south && !west);
        } else {
            drawModuleRoundendLight(context, left, top, right, bottom, radius, north && west && northwest, north && east && northeast, south && east && southeast, south && west && southwest);
        }
    }

    function drawModules(qr, context, settings) {
        var moduleCount = qr.moduleCount;
        var moduleSize = settings.size / moduleCount;
        var fn = drawModuleDefault;
        var row;
        var col;

        if (settings.radius > 0 && settings.radius <= 0.5) {
            fn = drawModuleRounded;
        }

        context.beginPath();
        for (row = 0; row < moduleCount; row += 1) {
            for (col = 0; col < moduleCount; col += 1) {
                var l = settings.left + col * moduleSize;
                var t = settings.top + row * moduleSize;
                var w = moduleSize;

                fn(qr, context, settings, l, t, w, row, col);
            }
        }
        if (jq(settings.fill).is('img')) {
            context.strokeStyle = 'rgba(0,0,0,0.5)';
            context.lineWidth = 2;
            context.stroke();
            var prev = context.globalCompositeOperation;
            context.globalCompositeOperation = 'destination-out';
            context.fill();
            context.globalCompositeOperation = prev;

            context.clip();
            context.drawImage(settings.fill, 0, 0, settings.size, settings.size);
            context.restore();
        } else {
            context.fillStyle = settings.fill;
            context.fill();
        }
    }

    // Draws QR code to the given `canvas` and returns it.
    function drawOnCanvas(canvas, settings) {
        var qr = createMinQRCode(settings.text, settings.ecLevel, settings.minVersion, settings.maxVersion, settings.quiet);
        if (!qr) {
            return null;
        }

        var $canvas = jq(canvas).data('qrcode', qr);
        var context = $canvas[0].getContext('2d');

        drawBackground(qr, context, settings);
        drawModules(qr, context, settings);

        return $canvas;
    }

    // Returns a `canvas` element representing the QR code for the given settings.
    function createCanvas(settings) {
        var $canvas = jq('<canvas/>').attr('width', settings.size).attr('height', settings.size);
        return drawOnCanvas($canvas, settings);
    }

    // Returns an `image` element representing the QR code for the given settings.
    function createImage(settings) {
        return jq('<img/>').attr('src', createCanvas(settings)[0].toDataURL('image/png'));
    }

    // Returns a `div` element representing the QR code for the given settings.
    function createDiv(settings) {
        var qr = createMinQRCode(settings.text, settings.ecLevel, settings.minVersion, settings.maxVersion, settings.quiet);
        if (!qr) {
            return null;
        }

        // some shortcuts to improve compression
        var settings_size = settings.size;
        var settings_bgColor = settings.background;
        var math_floor = Math.floor;

        var moduleCount = qr.moduleCount;
        var moduleSize = math_floor(settings_size / moduleCount);
        var offset = math_floor(0.5 * (settings_size - moduleSize * moduleCount));

        var row;
        var col;

        var containerCSS = {
            position: 'relative',
            left: 0,
            top: 0,
            padding: 0,
            margin: 0,
            width: settings_size,
            height: settings_size
        };
        var darkCSS = {
            position: 'absolute',
            padding: 0,
            margin: 0,
            width: moduleSize,
            height: moduleSize,
            'background-color': settings.fill
        };

        var $div = jq('<div/>').data('qrcode', qr).css(containerCSS);

        if (settings_bgColor) {
            $div.css('background-color', settings_bgColor);
        }

        for (row = 0; row < moduleCount; row += 1) {
            for (col = 0; col < moduleCount; col += 1) {
                if (qr.isDark(row, col)) {
                    jq('<div/>')
                        .css(darkCSS)
                        .css({
                            left: offset + col * moduleSize,
                            top: offset + row * moduleSize
                        })
                        .appendTo($div);
                }
            }
        }

        return $div;
    }

    function createHTML(settings) {
        if (hasCanvas && settings.render === 'canvas') {
            return createCanvas(settings);
        } else if (hasCanvas && settings.render === 'image') {
            return createImage(settings);
        }

        return createDiv(settings);
    }

    // Plugin
    // ======

    // Default settings
    // ----------------
    var defaults = {
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
        background: null,

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

    // Register the plugin
    // -------------------
    jq.fn.qrcode = function (options) {
        var settings = jq.extend({}, defaults, options);

        return this.each(function (idx, el) {
            if (el.nodeName.toLowerCase() === 'canvas') {
                drawOnCanvas(el, settings);
            } else {
                jq(el).append(createHTML(settings));
            }
        });
    };
}(function () {
    // `qrcode` is the single public function defined by the `QR Code Generator`
    // @include "../vendor/qrcode.js"
    // @include "../vendor/qrcode_UTF8.js"
    return qrcode; // eslint-disable-line no-undef
}()));
