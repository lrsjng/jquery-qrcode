(function () {
'use strict';

var $ = jQuery;
var guiValuePairs = [
        ['size', 'px'],
        ['minversion', ''],
        ['quiet', ' modules'],
        ['radius', '%'],
        ['msize', '%'],
        ['mposx', '%'],
        ['mposy', '%']
    ];

function updateGui() {

    $.each(guiValuePairs, function (idx, pair) {

        var $label = $('label[for="' + pair[0] + '"]');
        $label.text($label.text().replace(/:.*/, ': ' + $('#' + pair[0]).val() + pair[1]));
    });
}

function updateQrCode() {

    var options = {
            render: $('#render').val(),
            ecLevel: $('#eclevel').val(),
            minVersion: parseInt($('#minversion').val(), 10),

            fill: $('#fill').val(),
            background: $('#background').val(),
            // fill: $('#img-buffer')[0],

            text: $('#text').val(),
            size: parseInt($('#size').val(), 10),
            radius: parseInt($('#radius').val(), 10) * 0.01,
            quiet: parseInt($('#quiet').val(), 10),

            mode: parseInt($('#mode').val(), 10),

            mSize: parseInt($('#msize').val(), 10) * 0.01,
            mPosX: parseInt($('#mposx').val(), 10) * 0.01,
            mPosY: parseInt($('#mposy').val(), 10) * 0.01,

            label: $('#label').val(),
            fontname: $('#font').val(),
            fontcolor: $('#fontcolor').val(),

            image: $('#img-buffer')[0]
        };

    $('#container').empty().qrcode(options);
}

function update() {

    updateGui();
    updateQrCode();
}

function onImageInput() {

    var input = $('#image')[0];
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function (event) {
            $('#img-buffer').attr('src', event.target.result);
            $('#mode').val('4');
            setTimeout(update, 250);
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function download() {

    $('#download').attr('href', $('#container canvas')[0].toDataURL('image/png'));
}


$(function () {

    $('#download').on('click', download);
    $('#image').on('change', onImageInput);
    $('input, textarea, select').on('input change', update);
    $(window).load(update);
    update();
});

}());
