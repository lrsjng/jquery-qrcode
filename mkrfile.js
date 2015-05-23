/*jshint node: true */
'use strict';

module.exports = function (suite) {

    var path = require('path');
    var root = path.resolve(__dirname);
    var src = path.join(root, 'src');
    var dist = path.join(root, 'dist');
    var build = path.join(root, 'build');

    var $ = require('fquery');
    $.plugin('fquery-includeit');
    $.plugin('fquery-jade');
    $.plugin('fquery-jshint');
    $.plugin('fquery-jszip');
    $.plugin('fquery-uglifyjs');

    suite.defaults('release');

    suite.target('clean', [], 'delete build folder').task(function () {

        $([build, dist], {dirs: true}).delete();
    });

    suite.target('lint', [], 'lint all JavaScript files with JSHint').task(function () {

        var fs = require('fs');
        var jshint = JSON.parse(fs.readFileSync('.jshintrc', 'utf-8'));

        $(src + ': jquery.qrcode.js, demo/scripts.js')
            .jshint(jshint, jshint.globals);
    });

    suite.target('release', ['clean', 'lint'], 'build all files and create a zipball').task(function () {

        var pkg = require('./package.json');
        var header = '/* ' + pkg.displayName + ' ' + pkg.version + ' - ' + pkg.homepage + ' - uses //github.com/kazuhikoarase/qrcode-generator (MIT) */\n';
        var target = path.join(build, pkg.name + '-' + pkg.version + '.zip');
        var env = {pkg: pkg};

        $(src + ': jquery.qrcode.js')
            .includeit()
            .wrap(header)
            .write($.map.p(src, dist), true)
            .write($.map.p(src, build).s('.js', '-' + pkg.version + '.js'), true)
            .uglifyjs()
            .wrap(header)
            .write($.map.p(src, dist).s('.js', '.min.js'), true)
            .write($.map.p(src, build).s('.js', '-' + pkg.version + '.min.js'), true);

        $(src + ': **/*.jade')
            .jade(env)
            .write($.map.p(src, build).s('.jade', ''), true);

        $(src + ': **, ! *.js, ! **/*.jade, ! lib/**')
            .write($.map.p(src, build), true);

        $(root + ': *.md')
            .write($.map.p(root, build), true);

        $(build + ': **')
            .jszip({dir: build, level: 9})
            .write(target, true);
    });
};
