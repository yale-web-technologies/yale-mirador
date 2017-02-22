var ExtractTextPlugin = require('extract-text-webpack-plugin');
var path = require('path');
const webpack = require('webpack');

// The extra line added is a kludge to circumvent Drupal stripping comment lines
function header() {
  var gitDesc = process.env.GIT_DESC;
  var text = 'Yale-Mirador ' + gitDesc + ' built ' + new Date();
  return '// ' + text + '\nwindow._YaleMiradorVersion="' + text + '";\n\n';
}
process.traceDeprecation = true;

module.exports = {
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
    new ExtractTextPlugin('yale-mirador.bundle.css'),
    new webpack.BannerPlugin({
      banner: header(),
      test: /\.js$/,
      raw: true,
      entryOnly: true
    })
  ]
};
