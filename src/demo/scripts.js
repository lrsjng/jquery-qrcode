const WIN = global.window;
const JQ = WIN.jQuery;

const GUI_VALUE_PAIRS = [
    ['size', 'px'],
    ['minversion', ''],
    ['quiet', ' modules'],
    ['radius', '%'],
    ['msize', '%'],
    ['mposx', '%'],
    ['mposy', '%']
];

const update_gui = () => {
    JQ.each(GUI_VALUE_PAIRS, (idx, pair) => {
        const $label = JQ('label[for="' + pair[0] + '"]');
        $label.text($label.text().replace(/:.*/, ': ' + JQ('#' + pair[0]).val() + pair[1]));
    });
};

const update_qrcode = () => {
    const options = {
        render: JQ('#render').val(),
        ecLevel: JQ('#eclevel').val(),
        minVersion: parseInt(JQ('#minversion').val(), 10),

        fill: JQ('#fill').val(),
        background: JQ('#background').val(),

        text: JQ('#text').val(),
        size: parseInt(JQ('#size').val(), 10),
        radius: parseInt(JQ('#radius').val(), 10) * 0.01,
        quiet: parseInt(JQ('#quiet').val(), 10),

        mode: parseInt(JQ('#mode').val(), 10),

        mSize: parseInt(JQ('#msize').val(), 10) * 0.01,
        mPosX: parseInt(JQ('#mposx').val(), 10) * 0.01,
        mPosY: parseInt(JQ('#mposy').val(), 10) * 0.01,

        label: JQ('#label').val(),
        fontname: JQ('#font').val(),
        fontcolor: JQ('#fontcolor').val(),

        image: JQ('#img-buffer')[0]
    };

    // options.fill = JQ('#img-buffer')[0];
    // options.fill = 'rgba(255,0,0,0.5)';
    // options.background = JQ('#img-buffer')[0];
    // options.background = 'rgba(255,0,0,0.5)';

    JQ('#container').empty().qrcode(options);
};

const update = () => {
    update_gui();
    update_qrcode();
};

const on_img_input = () => {
    const input = JQ('#image')[0];
    if (input.files && input.files[0]) {
        const reader = new WIN.FileReader();
        reader.onload = event => {
            JQ('#img-buffer').attr('src', event.target.result);
            JQ('#mode').val('4');
            setTimeout(update, 250);
        };
        reader.readAsDataURL(input.files[0]);
    }
};

const init = () => {
    JQ('#image').on('change', on_img_input);
    JQ('input, textarea, select').on('input change', update);
    JQ(WIN).on('load', update);
    update();
};

JQ(init);
