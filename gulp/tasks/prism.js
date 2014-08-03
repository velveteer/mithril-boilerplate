var prism = require('connect-prism');

module.exports = function prismInit(prismMode) {
    prismMode = prismMode || 'proxy';
    prism.create({
        name: 'localApi',
        context: '/api',
        mode: prismMode,
        host: 'localhost',
        port: 3000
    });
};
