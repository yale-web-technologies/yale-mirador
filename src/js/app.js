require('../css/main.less');

import 'babel-polyfill';

import './extension/ext-global';
import './extension/ext-image-view';
import './extension/ext-manifest';
import './extension/ext-osd-region-draw-tool';
import './extension/dialog-builder';
import getConfigFetcher from './config/config-fetcher';
import getLogger from './util/logger';
import Grid from './grid';
//import MainMenu from './widgets/main-menu'; //deprecated
import getPageController from './page-controller';
import './extension/interface';
//import './util/jquery-tiny-pubsub-trace'; // import this only for debugging!

import getStateStore from './state-store';

export default class App {
  constructor(options) {
    this.logger = this.setupLogger();
    this.logger.debug('App#constructor');
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
      _this.logger.debug('Settings from API:', settingsFromApi);
      _this.preConfigureTinyMce(settingsFromApi.buildPath + '/');

      const settings = jQuery.extend(settingsFromHtml, settingsFromApi);
      const grid = new Grid(_this.options.rootElement);
      //const mainMenu = new MainMenu();

      this.initState(settings);

      getPageController().init({
        //mainMenu: mainMenu,
        grid: grid,
        settings: settings
      });
    })
    .catch(reason => {
      const msg = 'ERROR failed to init Mirador - ' + reason;
      alert(msg);
      throw msg;
    });
  }

  initState(apiSettings) {
    const state = getStateStore();

    if (apiSettings.copyrighted) {
      state.setString('copyrighted', 'true');
    } else {
      state.setString('copyrighted', 'false');
    }

    state.setString('copyrightedImageServiceUrl', apiSettings.copyrightedImageServiceUrl);

    if (apiSettings.fixAnnoCellHeight) {
      state.setString('ANNO_CELL_FIXED', 'true');
    } else {
      state.setString('ANNO_CELL_FIXED', 'false');
    }
  }

  setupLogger() {
    const logger = getLogger();
    if (window.location.hash === '#debug') {
      logger.setLogLevel(logger.DEBUG);
    } else {
      logger.setLogLevel(logger.INFO);
    }
    return logger;
  }

  preConfigureTinyMce(miradorBuildPath) {
    this.logger.debug('App#preConfigureTinyMce buildPath:', miradorBuildPath);
    tinymce.base = miradorBuildPath + '/';
    tinymce.setup();
  }
}
