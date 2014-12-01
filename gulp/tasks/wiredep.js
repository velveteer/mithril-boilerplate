var gulp = require('gulp');

// This wires dependencies using wiredep. In our case, we are putting bower components
// in the index.html sections marked by <!-- bower -->

// inject bower components into index.html
gulp.task('wiredep', function () {
    var wiredep = require('wiredep').stream;
    gulp.src('./src/index.html')
        .pipe(wiredep({
            directory: './bower_components'
        }))
        .pipe(gulp.dest('./src'));
});
