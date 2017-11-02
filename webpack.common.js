const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

process.traceDeprecation = true;

module.exports = {
  entry: {
    'yale-mirador': [
      './node_modules/babel-polyfill/dist/polyfill.js',
      './src/js/app.js',
      './src/js/export.js'
    ]
  },
  output: {
    path: path.resolve(__dirname, 'dist/yale-mirador'),
    filename: '[name].bundle.js',
    publicPath: '/public/'
  },
  module: {
    rules: [{
      test: /\.js$/,
      include: [
        path.resolve(__dirname, 'src/js')
      ],
      use: [{
        loader: 'babel-loader',
        options: { presets: ['es2015', 'es2017'] }
      }]
    }, {
      test: /\.less$/,
      use: ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use: [{
          loader: 'css-loader'
        }, {
          loader: 'less-loader'
        }]
      })
    }]
  },
  plugins: [
    new ExtractTextPlugin('yale-mirador.bundle.css'),
  ]
};
