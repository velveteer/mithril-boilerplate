var gulp = require('gulp');
var connect = require('connect');
var serveStatic = require('serve-static');
var historyApiFallback = require('connect-history-api-fallback');
var prism = require('connect-prism');
var prismInit = require('../util/prism');

gulp.task('connect', function (next) {

    var server = connect();

    // Prism proxies
    server.use(prism.middleware);
    // Start Prism
    prismInit();

    // HTML5 pushState fallback (useful for pathname routes)
    server.use(historyApiFallback());

    // Routes
    server.use(serveStatic('./src'));
    server.use(serveStatic('./.tmp'));

    // Start connect
    server.listen(9000, function() {
        console.log("Listening on http://localhost:9000/");
        next();
    });

});

