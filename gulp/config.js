var dest = "./.tmp";
var src = './src';

module.exports = {
  browserify: {
    // Enable source maps
    debug: true,
    bundleConfigs: [{
      entries: src + '/scripts/app.js',
      dest: dest,
      outputName: 'app.js'
    }]
  },
  images: {
    src: src + "/images/**",
    dest: "./dist/images"
  }
};
