// Karma configuration
// Generated on Mon Aug 01 2016 09:41:41 GMT-0400 (EDT)

var ExtractTextPlugin = require('extract-text-webpack-plugin');
var path = require('path');

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'sinon'],

    // list of files / patterns to load in the browser
    files: [
      'node_modules/mirador-y/dist/mirador/mirador.min.js',
      'node_modules/dexie/dist/dexie.min.js',
      'node_modules/js-cookie/src/js.cookie.js',
      'node_modules/semantic-ui/dist/semantic.min.js',
      'node_modules/babel-polyfill/dist/polyfill.js',
      'test/**/*.test.js' // XXX
      //'test/widgets/annotation-window/annotation-list-renderer.test.js'
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'src/js/**/*.js': ['webpack', 'sourcemap'],
      'test/**/*.test.js': ['webpack', 'sourcemap']
    },

    webpack: {
      module: {
        rules: [{
          test: /\.js$/,
          include: [
            path.resolve(__dirname, 'src/js'),
            path.resolve(__dirname, 'test')
          ],
          use: [{
            loader: 'babel-loader',
            options: { presets: ['es2015', 'es2017'] }
          }]
        }, {
          test: /\.less$/,
          use: ExtractTextPlugin.extract({
            fallbackLoader: 'style-loader',
            loader: [{
              loader: 'css-loader'
            }, {
              loader: 'less-loader'
            }]
          })
        }]
      },
      plugins: [
        new ExtractTextPlugin('yale-mirador.bundle.css')
      ]
    },

    plugins: [
      require('karma-webpack'),
      require('karma-sourcemap-loader'),
      require('karma-mocha'),
      require('karma-sinon'),
      require('karma-coverage'),
      require('karma-phantomjs-launcher')
    ],

    client: {
      captureConsole: true,
      mocha: {
        bail: true
      }
    },

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
    logLevel: config.LOG_DEBUG,

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
