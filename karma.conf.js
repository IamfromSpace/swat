// Karma configuration
// Generated on Thu Oct 13 2016 18:31:15 GMT-0700 (PDT)

module.exports = function(config) {
  config.set({
    files: ['run_karma_tests.js'],
    preprocessors: {
      'run_karma_tests.js': ['webpack'],
    },
    webpack: {
      module: {
        loaders: [
          { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
        ],
      },
    },
    reporters: ['spec'],
    browsers: ['Firefox'],
  })
}
