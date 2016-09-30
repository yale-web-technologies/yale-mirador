require('../css/main.less');

import 'babel-polyfill';

import './extension/ext-global';
import './extension/ext-image-view';
import './extension/ext-osd-region-draw-tool';
import './extension/dialog-builder';
import './annotation/yale-endpoint';
import './annotation/yale-demo-endpoint';
import './annotation/annotation-editor';
import './annotation/ym-annotation-selector';
import Grid from './grid';
import MainMenu from './widgets/main-menu';
import getMiradorWindow from './mirador-window';
import './extension/interface';
// import './util/override-pubsub';

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
  if (jQuery('#ym_grid').length > 0) {
    var app = new App();
  }
});
