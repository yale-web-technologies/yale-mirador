// Karma configuration
// Generated on Mon Aug 01 2016 09:41:41 GMT-0400 (EDT)

var webpackConfig = require('./webpack.config.js');
webpackConfig.entry = {}; // entry not wanted in karma

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],

    // list of files / patterns to load in the browser
    files: [
      'dist/mirador/mirador.js',
      'lib/js.cookie.js',
      'lib/semantic/dist/semantic.min.js',
      'lib/goldenlayout/goldenlayout.min.js',
      'lib/dexie.js',
      'dist/yale-mirador/yale-mirador.bundle.js',
      'test/**/*-test.js'
    ],

    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'src/js/**/*.js': ['webpack', 'sourcemap'],
      'test/**/*-test.js': ['webpack', 'sourcemap']
    },
    
    webpack: webpackConfig,
    
    plugins: [
      require('karma-webpack'),
      require('karma-sourcemap-loader'),
      require('karma-mocha'),
      require('karma-phantomjs-launcher'),
      require('karma-coverage')
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};
