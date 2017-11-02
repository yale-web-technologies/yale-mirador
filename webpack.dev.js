const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  devtool: 'inline-source-map',
  devServer: {
    port: 3000,
    openPage: '#debug',
    watchOptions: {
      poll: 2000,
      ignored: /node_modules/
    }
  },

});
