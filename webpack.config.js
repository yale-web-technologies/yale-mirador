var ExtractTextPlugin = require('extract-text-webpack-plugin');
var VersionFile = require('webpack-version-file-plugin');
var BannerWebpackPlugin = require('banner-webpack-plugin');
var path = require('path');
var npmPackage = require('./package');

// The extra line added is a kludge to circumvent Drupal stripping comment lines
function header() {
  var text = 'Yale-Mirador version ' + npmPackage.version + ' - ' + new Date();
  return '// ' + text + '\nwindow._YaleMiradorVersion="' + text + '";\n\n';
}
module.exports = {
  debug: false,
  entry: {
    'yale-mirador': [
      './src/js/app.js',
      './src/js/bootstrap.js'
    ]
  },
  output: {
    path: './dist/yale-mirador',
    filename: 'yale-mirador.bundle.js'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      include: [
        path.resolve(__dirname, 'src/js')
      ],
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
    new BannerWebpackPlugin({
      chunks: {
        'yale-mirador': {
          beforeContent: header()
        }
      }
    })
  ]
};
