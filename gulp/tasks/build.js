var gulp = require('gulp');
var gulpif = require('gulp-if');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var csso = require('gulp-csso');
var plumber = require('gulp-plumber');

gulp.task('build', ['browserify', 'styles', 'images'], function() {
    var assets = useref.assets({ searchPath: ['./.tmp', './src'] });

    return gulp.src('./src/index.html')
        .pipe(plumber())
        .pipe(assets)
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', csso()))
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest('./dist'));
});
