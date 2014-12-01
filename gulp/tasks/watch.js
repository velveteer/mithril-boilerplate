var gulp = require('gulp');
var livereload = require('gulp-livereload');

// Watch for changes
gulp.task('watch', ['serve'], function (next) {
    livereload.listen();
    global.isWatching = true;

    gulp.watch(['./src/scripts/**/*.js', './src/index.html'], ['browserify']);
    gulp.watch(['./src/styles/**/*.less'], ['styles']);
    gulp.watch('bower.json', ['wiredep']);

    gulp.watch('./.tmp/**').on('change', function (file) {
        livereload.changed(file.path);
    });
});

