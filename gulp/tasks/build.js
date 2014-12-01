var gulp = require('gulp');
var filter = require('gulp-filter');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var csso = require('gulp-csso');
var plumber = require('gulp-plumber');

gulp.task('build', ['browserify', 'styles', 'images'], function() {
    var jsFilter = filter('**/*.js');
    var cssFilter = filter('**/*.css');

    return gulp.src('./src/index.html')
        .pipe(plumber())
        .pipe(useref.assets({ searchPath: ['./.tmp', './src'] }))
        .pipe(jsFilter)
        .pipe(uglify())
        .pipe(jsFilter.restore())
        .pipe(cssFilter)
        .pipe(csso())
        .pipe(cssFilter.restore())
        .pipe(useref.restore())
        .pipe(useref())
        .pipe(gulp.dest('./dist'));
});
