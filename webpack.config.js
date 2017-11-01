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
  devtool: 'source-map',
  devServer: {
    port: 3000,
    openPage: '#debug',
    watchOptions: {
      poll: 2000,
      ignored: /node_modules/
    }
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
