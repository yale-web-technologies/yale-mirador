var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  debug: true,
  entry: './src/js/app.js',
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
        presets: ['es2015']
      }
    }, {
      test: /\.less$/,
      exclude: /node_modules/,
      loader: ExtractTextPlugin.extract('style-loader', 'css-loader!less-loader')
    }]
  },
  plugins: [
    new ExtractTextPlugin('yale-mirador.bundle.css', { allChunks: true })
  ]
};
