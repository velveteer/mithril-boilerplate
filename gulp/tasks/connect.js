var gulp = require('gulp');
var connect = require('connect');
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
    server.use(historyApiFallback);

    // Routes
    server.use(connect.static('./src'));
    server.use(connect.static('./.tmp'));

    // Start connect
    server.listen(9000, next)
});

