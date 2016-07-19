require('../css/main.less');

import 'babel-polyfill';
import './init';
import Grid from './grid';
import MainMenu from './widgets/main-menu';
import getMiradorWindow from './mirador-window';

import './plugins/yale-endpoint';
import './plugins/yale-demo-endpoint';
import './plugins/annotation-editor';

class App {
  constructor() {
    console.log('App.constructor');
    var mainMenu = new MainMenu();
    var grid = new Grid();
    getMiradorWindow().init({ mainMenu: mainMenu, grid: grid });
  }
}

jQuery(document).ready(function () {
  console.log('Yale Mirador Extension document ready');
  if (jQuery('#mr_grid').size() > 0) {
    var app = new App();
  }
});
