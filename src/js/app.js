require('../css/main.less');

import 'babel-polyfill';

import './extension/ext-global';
import './extension/ext-image-view';
import './extension/ext-manifest';
import './extension/ext-osd-region-draw-tool';
import './extension/dialog-builder';
import {AnnotationExplorer} from './import';
import AnnotationSource from './annotation-data/annotation-source';
import getConfigFetcher from './config/config-fetcher';
import getLogger from './util/logger';
import Grid from './grid';
//import MainMenu from './widgets/main-menu'; //deprecated
import getPageController from './page-controller';
import './extension/interface';
//import './util/jquery-tiny-pubsub-trace'; // import this only for debugging!

import getStateStore from './state-store';

const logger = getLogger();
let instance = null;
let annotationExplorer = null;

export default function getApp() {
  if (!instance) {
    instance = new App({
      rootElement: 'ym_grid',
      dataElement: jQuery('#\\{\\{id\\}\\}') // {{id}} gets replaced with the Mirador instance ID by the Grid
    });
  }
  return instance;
}

class App {
  constructor(options) {
    this._setupLogger();
    logger.debug('App#constructor');
    this.options = jQuery.extend({
      rootElement: null,
      dataElement: null
    }, options);
  }

  async init() {
    const configFetcher = getConfigFetcher();
    const settingsFromHtml = configFetcher.fetchSettingsFromHtml(this.options.dataElement);
    const {apiUrl, projectId} = settingsFromHtml;

    getStateStore().setObject('layerIndexMap', null);

    const settingsFromApi = await configFetcher.fetchSettingsFromApi(apiUrl, projectId)
    .catch(reason => {
      const msg = 'ERROR failed to retrieve server setting - ' + reason;
      throw msg;
    });

    logger.debug('Settings from API:', settingsFromApi);
    this._preConfigureTinyMce(settingsFromApi.buildPath + '/');

    const settings = jQuery.extend(settingsFromHtml, settingsFromApi);
    await this.initState(settings);

    const grid = new Grid(this.options.rootElement);
    //const mainMenu = new MainMenu();

    getPageController().init({
      //mainMenu: mainMenu,
      grid: grid,
      settings: settings
    });

    return this;
  }

  async initState(settings) {
    logger.debug('App#initState settings:', settings);
    const state = getStateStore();
    const explorer = this.getAnnotationExplorer(settings.endpointUrl);

    state.setTransient('projectId', settings.projectId);
    state.setTransient('disableAuthz', settings.disableAuthz);

    const layers = await explorer.getLayers();
    state.setTransient('annotationLayers', layers);

    state.setTransient('annotationBackendUrl', settings.endpointUrl);
    state.setTransient('copyrighted', settings.copyrighted);
    state.setTransient('copyrightedImageServiceUrl', settings.copyrightedImageServiceUrl);

    if (settings.fixAnnoCellHeight) {
      state.setString('ANNO_CELL_FIXED', 'true');
    } else {
      state.setString('ANNO_CELL_FIXED', 'false');
    }
  }

  _setupLogger() {
    if (window.location.hash === '#debug') {
      logger.setLogLevel(logger.DEBUG);
    } else {
      logger.setLogLevel(logger.INFO);
    }
  }

  _preConfigureTinyMce(miradorBuildPath) {
    logger.debug('App#preConfigureTinyMce buildPath:', miradorBuildPath);
    tinymce.base = miradorBuildPath + '/';
    tinymce.setup();
  }

  getAnnotationExplorer(annotationBackendUrl) {
    if (!annotationExplorer) {
      annotationExplorer = new AnnotationExplorer({
        dataSource: new AnnotationSource({
          prefix: annotationBackendUrl
        })
      });
    }
    return annotationExplorer;
  }
}
