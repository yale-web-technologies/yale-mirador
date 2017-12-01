// Karma configuration
// Generated on Mon Aug 01 2016 09:41:41 GMT-0400 (EDT)

const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');

// A single file to test
const singleFile = (args => {
  lastIx = args.length - 1;
  return args[lastIx-1] === '-f' ? args[lastIx] : null;
})(process.argv);

module.exports = function (config) {
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
      singleFile || 'test/**/*.test.js'
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/**/*.test.js': ['webpack', 'sourcemap']
    },

    webpack: {
      module: {
        rules: [{
          test: /\.js$/,
          include: [
            path.resolve(__dirname, 'src/js'),
          ],
          use: [{
            loader: 'istanbul-instrumenter-loader'
          }, {
            loader: 'babel-loader',
            options: { presets: ['es2015', 'es2017'] }
          }]
        }, {
          test: /\.js$/,
          include: [
            path.resolve(__dirname, singleFile || 'test')
          ],
          use: [{
            loader: 'babel-loader',
            options: { presets: ['es2015', 'es2017'] }
          }]
        },
        {
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
      devtool: 'inline-source-map',
      plugins: [
        new ExtractTextPlugin('yale-mirador.bundle.css')
      ],
      resolve: {
        modules: [
          path.resolve('./src/js'),
          path.resolve('./node_modules')
        ]
      }
    },

    plugins: [
      require('karma-webpack'),
      require('karma-sourcemap-loader'),
      require('karma-mocha'),
      require('karma-sinon'),
      require('karma-coverage'),
      require('karma-coverage-istanbul-reporter'),
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
    reporters: ['progress', 'coverage-istanbul'],

    coverageIstanbulReporter: {
      reports: ['html'],
      dir: path.join(__dirname, 'coverage'),
      fixWebpackSourcePaths: true
    },

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
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};
