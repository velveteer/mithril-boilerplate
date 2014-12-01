var gulp = require('gulp');
var livereload = require('gulp-livereload');

// Watch for changes
gulp.task('watch', ['setWatch', 'serve'], function () {
    livereload.listen();

    gulp.watch('./src/styles/**/*.less', ['styles']);
    gulp.watch('./src/images/**', ['images']);
    gulp.watch('bower.json', ['wiredep']);
    gulp.watch('./.tmp/**').on('change', function (file) {
        livereload.changed(file.path);
    });
});

