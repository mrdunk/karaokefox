const { parallel, series, src, dest } = require('gulp');
var tslint = require("gulp-tslint");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("src/tsconfig.json");
var sourcemaps = require('gulp-sourcemaps');
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var tsify = require("tsify");
var glob = require('glob');
var log = require("gulplog");
var watch = require('gulp-watch');
var htmlValidator = require('gulp-html');
var htmlmin = require('gulp-htmlmin');
var cssMin = require('gulp-css');
var flatmap = require('gulp-flatmap');
var size = require('gulp-size');

function lintTs() {
  return tsProject.src()
    .pipe(tslint({
      formatter: "prose"
    }))
    .pipe(tslint.report({
      emitError: false
    }));
}

function buildTsSeperate() {
  return tsProject.src()
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(sourcemaps.write('.', { sourceRoot: './' }))
    .pipe(dest("dist"));
}

function buildTsBundle() {
  return glob('src/*.ts', function(err, files) {
    log.info(files);
    if(err) done(err);
    return browserify({
          basedir: '.',
          entries: files,
          cache: {},
          packageCache: {}
      })
      .plugin(tsify, { target: 'es6' })
      .bundle()
      .on('error', function (error) { console.error(error.toString()); })
      .pipe(source('bundle.js'))
      .pipe(dest("dist"));
  });
}

function buildTsBundleDebug() {
  return glob('src/*.ts', function(err, files) {
    log.info(files);
    if(err) done(err);
    return browserify({
          basedir: '.',
          debug: true,
          entries: files,
          cache: {},
          packageCache: {}
      })
      .plugin(tsify, { target: 'es6' })
      .bundle()
      .on('error', function (error) { console.error(error.toString()); })
      .pipe(source('bundle.debug.js'))
      .pipe(dest("dist"));
  });
}

function clean(cp) {
  // TODO
  cb();
}

function watchFiles() {
  return watch('src/*.ts', exports.build);
}

function html() {
  return src(['./src/*.html'])
    .pipe(htmlValidator())
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(dest('./dist'));
}

function css() {
  return src(['./src/*.css'])
    .pipe(cssMin())
    .pipe(dest('dist'));
}

function assets() {
  return src(['./src/textures/**/*', './src/scenes/**/*'])
    .pipe(flatmap(function(stream, file) {
      return src(file.path, {base: './src/'})
        .pipe(size({ showFiles:true }));
    }))
    .pipe(dest('dist'));
}

exports.clean = clean;
exports.watch = watchFiles;
exports.buildTsSeperate = buildTsSeperate;
exports.buildTsBundle = buildTsBundle;
exports.buildTsBundleDebug = buildTsBundleDebug;
exports.html = html;
exports.css = css;
exports.assets = assets;

exports.lint = series(lintTs);
exports.buildTs = parallel(buildTsSeperate, buildTsBundle, buildTsBundleDebug);
exports.build = series(exports.lint, exports.buildTs);
exports.default = parallel(exports.build, exports.html, exports.css, exports.assets);
