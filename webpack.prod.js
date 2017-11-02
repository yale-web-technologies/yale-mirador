const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');

// The extra line added is a kludge to circumvent Drupal stripping comment lines
function header() {
  var gitDesc = process.env.GIT_DESC;
  var text = 'Yale-Mirador ' + gitDesc + ' built ' + new Date();
  return '// ' + text + '\nwindow._YaleMiradorVersion="' + text + '";\n\n';
}

module.exports = merge(common, {
  devtool: 'source-map',
  plugins: [
    new webpack.BannerPlugin({
      banner: header(),
      test: /\.js$/,
      raw: true,
      entryOnly: true
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new UglifyJSPlugin({
      sourceMap: true
    }),
  ]
});
