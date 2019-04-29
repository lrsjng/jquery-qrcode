const {resolve, join} = require('path');
const {ghu, pug, jszip, mapfn, read, remove, webpack, uglify, wrap, write} = require('ghu');
const overwrite = arg => write(arg, {overwrite: true});

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

ghu.task('clean', () => {
    return remove(`${BUILD}, ${DIST}`);
});

ghu.task('build:scripts', runtime => {
    return read(`${SRC}/${NAME}.js`)
        .then(webpack(webpack.cfg_umd(NAME, [SRC])))
        .then(wrap(runtime.commentJs))
        .then(overwrite(`${DIST}/${NAME}.js`))
        .then(overwrite(`${BUILD}/${NAME}-${runtime.pkg.version}.js`))
        .then(uglify())
        .then(wrap(runtime.commentJs))
        .then(overwrite(`${DIST}/${NAME}.min.js`))
        .then(overwrite(`${BUILD}/${NAME}-${runtime.pkg.version}.min.js`));
});

ghu.task('build:other', runtime => {
    return Promise.all([
        read(`${ROOT}/*.md`)
            .then(overwrite(mapfn.p(ROOT, BUILD))),

        read(`${SRC}/demo/*.pug`)
            .then(pug({pkg: runtime.pkg}))
            .then(overwrite(mapfn.p(SRC, BUILD).s('.pug', ''))),
        read(`${SRC}/demo/*.js`)
            .then(webpack(webpack.cfg([SRC])))
            .then(uglify())
            .then(wrap(runtime.commentJs))
            .then(overwrite(mapfn.p(SRC, BUILD))),
        read(`${SRC}/demo/*, !**/*.pug, !**/*.js`)
            .then(overwrite(mapfn.p(SRC, BUILD))),

        read(`${ROOT}/node_modules/jquery/dist/jquery.min.js`)
            .then(overwrite(`${BUILD}/demo/jquery.min.js`))
    ]);
});

ghu.task('build', ['build:scripts', 'build:other']);

ghu.task('zip', ['build'], runtime => {
    return read(`${BUILD}/**/*`)
        .then(jszip({dir: BUILD, level: 9}))
        .then(overwrite(`${BUILD}/${NAME}-${runtime.pkg.version}.zip`));
});

ghu.task('release', ['clean', 'zip']);
