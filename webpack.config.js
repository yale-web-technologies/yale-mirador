var ExtractTextPlugin = require('extract-text-webpack-plugin');
var VersionFile = require('webpack-version-file-plugin');
var path = require('path');

module.exports = {
  debug: true,
  entry: ['./src/js/app.js', './src/js/bootstrap.js'],
  output: {
    path: './dist/yale-mirador',
    filename: 'yale-mirador.bundle.js'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015', 'es2017']
      }
    }, {
      test: /\.less$/,
      exclude: /node_modules/,
      loader: ExtractTextPlugin.extract('style-loader', 'css-loader!less-loader')
    }]
  },
  plugins: [
    new ExtractTextPlugin('yale-mirador.bundle.css', { allChunks: true }),
    new VersionFile({
      packageFile: path.join(__dirname, 'package.json'),
      template: path.join(__dirname, 'src', 'template', 'version.ejs'),
      outputFile: path.join(__dirname, 'dist', 'yale-mirador', 'version.json')
    })
  ]
};
