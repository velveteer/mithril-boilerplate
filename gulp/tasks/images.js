var gulp = require('gulp');
var cache = require('gulp-cache');
var imagemin = require('gulp-imagemin');

// Reference for optimization levels: https://github.com/gruntjs/grunt-contrib-imagemin#optimizationlevel-png

gulp.task('images', function () {
    return gulp.src('src/images/**/*')
        .pipe(cache(imagemin({
            optimizationLevel: 3,
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest('./dist/images'));
});
