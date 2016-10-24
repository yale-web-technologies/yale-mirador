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
//import './util/override-pubsub'; // import this only for debugging!

export default class App {
  constructor(element) {
    console.log('App.constructor');
    var mainMenu = new MainMenu();
    var grid = new Grid(element);
    getMiradorWindow().init({ mainMenu: mainMenu, grid: grid });
  }
}
