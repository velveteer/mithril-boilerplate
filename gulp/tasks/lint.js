var gulp = require('gulp');
var plumber = require('gulp-plumber');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');

// JSHint and jscs
gulp.task('lint', function () {
    return gulp.src(['./src/scripts/**/*.js'])
        .pipe(plumber())
        .pipe(jscs())
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter(stylish)); // Console output
});
