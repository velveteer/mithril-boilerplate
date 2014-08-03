var gulp = require('gulp');
var less = require('gulp-less');
var rename = require('gulp-rename');

gulp.task('styles', function () {
  return gulp.src('src/styles/app.less')
        .pipe(less({
            paths: ['src/styles/']
        }))
        .pipe(rename('app.css'))
        .pipe(gulp.dest('./.tmp'));
});
