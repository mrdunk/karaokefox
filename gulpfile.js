const { parallel, series, src, dest } = require('gulp');
var tslint = require("gulp-tslint");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("src/tsconfig.json");
var sourcemaps = require('gulp-sourcemaps');

function defaultTask(cb) {
  // place code for your default task here
  cb();
}

function lintTs() {
  return tsProject.src()
    .pipe(tslint({
      formatter: "prose"
    }))
    .pipe(tslint.report({
      emitError: false
    }));
}

function buildTs() {
  	return tsProject.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject())
		.pipe(sourcemaps.write('.', { sourceRoot: './', includeContent: false }))
		.pipe(dest("dist"));
}

function combineJs(cb) {
  // TODO
  cb();
}

function clean(cp) {
  // TODO
  cb();
}

exports.clean = clean;
exports.buildTs = series(lintTs, buildTs, combineJs);
exports.build = parallel(exports.buildTs);
exports.default = parallel(defaultTask, exports.build);
