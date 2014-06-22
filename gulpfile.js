var gulp = require('gulp');
var plugins = require("gulp-load-plugins")({lazy:false});
var historyApiFallback = require('connect-history-api-fallback');
var es = require('event-stream');

gulp.task('clean', function() {
    // Clear the destination folder
    gulp.src('dist/**/*.*', {
        read: false
    })
        .pipe(plugins.clean({
            force: true
        }));
});

gulp.task('copy-index', function() {
    // Copy index file
    gulp.src('./src/index.html')
        .pipe(gulp.dest('./dist'))
});

gulp.task('copy-assets', function() {
    gulp.src('./src/styles/assets/*')
        .pipe(gulp.dest('./dist/styles'))
});

gulp.task('copy-fonts', function() {
    gulp.src('./src/fonts/*')
        .pipe(gulp.dest('./dist/fonts'))
});

gulp.task('scripts', function() {
    return es.concat(
        // Detect errors and potential problems in your JavaScript code
        // You can enable or disable default JSHint options in the .jshintrc file
        gulp.src(['!./src/scripts/vendor/**/*.js', './src/scripts/**/*.js'])
            .pipe(plugins.jshint('.jshintrc'))
            .pipe(plugins.jshint.reporter(require('jshint-stylish'))),

        // Browserify
        gulp.src(['!./src/scripts/vendor/**/*.js', './src/scripts/app.js'])
            .pipe(plugins.browserify({
                insertGlobals: true
            }))
            .pipe(gulp.dest('./dist/scripts'))
    );
});

gulp.task('vendorScripts', function(){
    gulp.src(['!./bower_components/**/*.min.js',
        './bower_components/**/*.js', './src/scripts/vendor/**/*.js'])
        .pipe(plugins.concat('vendor.js'))
        .pipe(gulp.dest('./dist/scripts'));
});

gulp.task('styles', function() {
    // Compile LESS files
    return gulp.src('./src/styles/app.less')
        .pipe(plugins.less())
        .pipe(plugins.rename('app.css'))
        .pipe(plugins.csso())
        .pipe(gulp.dest('./dist/styles'))
});

gulp.task('vendorStyles', function(){
    gulp.src(['!./bower_components/**/*.min.css',
        './bower_components/**/*.css', './src/styles/vendor/*.css'])
        .pipe(plugins.concat('vendor.css'))
        .pipe(gulp.dest('./dist/styles'));
});

gulp.task('connect', plugins.connect.server({
    root: ['dist'],
    port: 9000,
    livereload: true,
    middleware: function(connect, o) {
        return [ (function() {
            var url = require('url');
            var proxy = require('proxy-middleware');
            var options = url.parse('http://localhost:3000/api');
            options.route = '/api'
            return proxy(options);
        })(), historyApiFallback ];
    }
}));

gulp.task('watch',function(){
    gulp.watch([
        './src/**/*.html',
        './src/**/*.js',
        './src/**/*.less'
    ], function(event) {
        return gulp.src(event.path)
            .pipe(plugins.connect.reload());
    });
    gulp.watch('./src/**/*.js',['scripts']);
    gulp.watch('./src/**/*.less',['styles']);
    gulp.watch('./src/index.html',['copy-index']);

});

// The default task (called when you run `gulp`)
gulp.task('default', ['clean', 'connect', 'copy-index', 'copy-assets', 'copy-fonts', 'scripts', 'styles', 'vendorScripts', 'vendorStyles', 'watch']);
