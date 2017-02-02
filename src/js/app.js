require('../css/main.less');

import 'babel-polyfill';

import './extension/ext-global';
import './extension/ext-image-view';
import './extension/ext-osd-region-draw-tool';
import './extension/dialog-builder';
import './annotation/yale-endpoint';
import './annotation/annotation-editor';
import './annotation/ym-annotation-selector';
import getConfigFetcher from './config/config-fetcher';
import Grid from './grid';
import MainMenu from './widgets/main-menu';
import getMiradorWindow from './mirador-window';
import './extension/interface';
//import './util/jquery-tiny-pubsub-trace'; // import this only for debugging!

import getStateStore from './state-store';

export default class App {
  constructor(options) {
    //console.log('App#constructor');
    this.options = jQuery.extend({
      rootElement: null,
      dataElement: null
    }, options);
  }

  init() {
    const _this = this;
    const configFetcher = getConfigFetcher();
    const settingsFromHtml = configFetcher.fetchSettingsFromHtml(this.options.dataElement);
    const {apiUrl, projectId} = settingsFromHtml;

    getStateStore().setObject('layerIndexMap', null);

    configFetcher.fetchSettingsFromApi(apiUrl, projectId)
    .catch(reason => {
      const msg = 'ERROR failed to retrieve server setting - ' + reason;
      throw msg;
    })
    .then(settingsFromApi => {
      console.log('Settings from API:', settingsFromApi);
      const mainMenu = new MainMenu();
      const grid = new Grid(_this.options.rootElement);
      const settings = jQuery.extend(settingsFromHtml, settingsFromApi);

      getMiradorWindow().init({
        mainMenu: mainMenu,
        grid: grid,
        settings: settings
      });
    })
    .catch(reason => {
      alert('ERROR failed to init Mirador - ' + reason);
    });
  }
}
