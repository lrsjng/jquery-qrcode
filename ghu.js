const {resolve, join} = require('path');
const {ghu, includeit, jade, jszip, mapfn, read, remove, uglify, wrap, write} = require('ghu');

const NAME = 'jquery-qrcode';

const ROOT = resolve(__dirname);
const SRC = join(ROOT, 'src');
const VENDOR = join(ROOT, 'vendor');
const BUILD = join(ROOT, 'build');
const DIST = join(ROOT, 'dist');

ghu.defaults('release');

ghu.before(runtime => {
    runtime.pkg = Object.assign({}, require('./package.json'));
    runtime.comment = `${runtime.pkg.name} v${runtime.pkg.version} - ${runtime.pkg.homepage}`;
    runtime.commentJs = `/*! ${runtime.comment} */\n`;

    console.log(runtime.comment);
});

ghu.task('clean', 'delete build folder', () => {
    return remove(`${BUILD}, ${DIST}`);
});

ghu.task('build:scripts', runtime => {
    return read(`${SRC}/${NAME}.js`)
        .then(includeit())
        .then(wrap(runtime.commentJs))
        .then(write(`${DIST}/${NAME}.js`, {overwrite: true}))
        .then(write(`${BUILD}/${NAME}-${runtime.pkg.version}.js`, {overwrite: true}))
        .then(uglify({compressor: {warnings: false}}))
        .then(wrap(runtime.commentJs))
        .then(write(`${DIST}/${NAME}.min.js`, {overwrite: true}))
        .then(write(`${BUILD}/${NAME}-${runtime.pkg.version}.min.js`, {overwrite: true}));
});

ghu.task('build:demo', runtime => {
    return Promise.all([
        read(`${SRC}/demo/*.jade`)
            .then(jade({pkg: runtime.pkg}))
            .then(write(mapfn.p(SRC, BUILD).s('.jade', ''), {overwrite: true})),
        read(`${SRC}/demo/*, !**/*.jade`)
            .then(write(mapfn.p(SRC, BUILD), {overwrite: true}))
    ]);
});

ghu.task('build:copy', () => {
    return Promise.all([
        read(`${VENDOR}/demo/*`)
            .then(write(mapfn.p(VENDOR, BUILD), {overwrite: true})),
        read(`${ROOT}/*.md`)
                .then(write(mapfn.p(ROOT, BUILD), {overwrite: true}))
    ]);
});

ghu.task('build', ['build:scripts', 'build:demo', 'build:copy']);

ghu.task('zip', ['build'], runtime => {
    return read(`${BUILD}/**/*`)
        .then(jszip({dir: BUILD, level: 9}))
        .then(write(`${BUILD}/${NAME}-${runtime.pkg.version}.zip`, {overwrite: true}));
});

ghu.task('release', ['clean', 'zip']);
