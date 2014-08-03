var gulp = require('gulp');
var livereload = require('connect-livereload');
var refresh  = require('gulp-livereload');
var connect = require('connect');
var historyApiFallback = require('connect-history-api-fallback');
var prism = require('connect-prism');
var prismInit = require('./prism');

// Run Connect server
var lrport = 35729;
var server = connect();

// Prism proxies
server.use(prism.middleware);

// Add live reload
server.use(livereload({ port: lrport }));

// HTML5 pushState fallback
server.use(historyApiFallback);

// Routes
server.use(connect.static('./src'));
server.use(connect.static('./.tmp'));

gulp.task('connect', function () {
    // Start webserver
    require('http').createServer(server)
        .listen(9000)
        .on('listening', function() {
            console.log('Started connect web server on http://localhost:9000');
        });
    // Start live reload
    refresh.listen();
    // Start Prism
    prismInit();
});

// Determine watchify/browserify
gulp.task('setWatch', function() {
    global.isWatching = true;
});

// Watch for changes
gulp.task('watch', ['connect', 'serve'], function () {
    gulp.watch(['./src/scripts/**/*.js', './src/index.html'], ['browserify']);
    gulp.watch(['./src/styles/**/*.less'], ['styles']);
    gulp.watch('src/images/**/*', ['images']);
    gulp.watch('bower.json', ['wiredep']);
    gulp.watch('./.tmp/**').on('change', refresh.changed);
});
