const {resolve, join} = require('path');
const {ghu, includeit, pug, jszip, mapfn, read, remove, webpack, uglify, wrap, write} = require('ghu');

const NAME = 'jquery-qrcode';

const ROOT = resolve(__dirname);
const SRC = join(ROOT, 'src');
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
        .then(webpack(webpack.cfg_umd(NAME, [SRC]), {showStats: false}))
        .then(includeit())
        .then(wrap(runtime.commentJs))
        .then(write(`${DIST}/${NAME}.js`, {overwrite: true}))
        .then(write(`${BUILD}/${NAME}-${runtime.pkg.version}.js`, {overwrite: true}))
        .then(uglify())
        .then(wrap(runtime.commentJs))
        .then(write(`${DIST}/${NAME}.min.js`, {overwrite: true}))
        .then(write(`${BUILD}/${NAME}-${runtime.pkg.version}.min.js`, {overwrite: true}));
});

ghu.task('build:demo', runtime => {
    return Promise.all([
        read(`${SRC}/demo/*.pug`)
            .then(pug({pkg: runtime.pkg}))
            .then(write(mapfn.p(SRC, BUILD).s('.pug', ''), {overwrite: true})),
        read(`${SRC}/demo/*.js`)
            .then(webpack(webpack.cfg([SRC]), {showStats: false}))
            .then(uglify())
            .then(wrap(runtime.commentJs))
            .then(write(mapfn.p(SRC, BUILD), {overwrite: true})),
        read(`${SRC}/demo/*, !**/*.pug, !**/*.js`)
            .then(write(mapfn.p(SRC, BUILD), {overwrite: true})),

        read(`${ROOT}/node_modules/jquery/dist/jquery.min.js`)
            .then(write(`${BUILD}/demo/jquery.min.js`, {overwrite: true}))
    ]);
});

ghu.task('build:copy', () => {
    return Promise.all([
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
