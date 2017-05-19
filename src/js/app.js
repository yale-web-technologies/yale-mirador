require('../css/main.less');

import './extension/ext-global';
import './extension/ext-image-view';
import './extension/ext-manifest';
import './extension/ext-osd-region-draw-tool';
import './extension/dialog-builder';
import {AnnotationExplorer} from './import';
import AnnotationSource from './annotation-data/annotation-source';
import fatalError from './util/fatal-error';
import getConfigFetcher from './config/config-fetcher';
import getLogger from './util/logger';
import getPageController from './page-controller';
import getStateStore from './state-store';
import Grid from './layout/grid';
//import MainMenu from './widgets/main-menu'; //deprecated
//import './util/jquery-tiny-pubsub-trace'; // import this only for debugging!

const logger = getLogger();
let instance = null;
let annotationExplorer = null;
let annotationSource = null;

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
    this.initHandlebars();

    const configFetcher = getConfigFetcher();
    const settingsFromHtml = configFetcher.fetchSettingsFromHtml(this.options.dataElement);
    const {apiUrl, projectId} = settingsFromHtml;
    let error = false;

    // Retrieve settings from the server
    const settingsFromApi = await configFetcher.fetchSettingsFromApi(apiUrl, projectId)
    .catch(reason => {
      logger.error('Failed to retrieve server setting', reason);
      error = true;
      fatalError(reason, 'Retrieving settings from server');
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

  initHandlebars() {
    Handlebars.registerHelper('t', function(i18nKey) {
      return i18next.t(i18nKey);
    });
  }

  async initState(settings) {
    logger.debug('App#initState settings:', settings);
    const state = getStateStore();

    state.setTransient('annotationBackendUrl', settings.endpointUrl);
    const explorer = this.getAnnotationExplorer();

    state.setTransient('projectId', settings.projectId);
    state.setTransient('disableAuthz', settings.disableAuthz);

    const layers = await explorer.getLayers();
    state.setTransient('annotationLayers', layers);

    state.setTransient('copyrighted', settings.copyrighted);
    state.setTransient('copyrightedImageServiceUrl', settings.copyrightedImageServiceUrl);

    if (settings.ui) {
      state.setBoolean('fixAnnoCellHeight', settings.ui.fixAnnoCellHeight);
      state.setString('textDirection', settings.ui.textDirection);
      state.setTransient('annotationsOverlay', settings.ui.annotationsOverlay);
      state.setTransient('tooltipStyles', settings.ui.tooltipStyles);
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

  getAnnotationExplorer() {
    if (!annotationExplorer) {
      annotationExplorer = new AnnotationExplorer({
        dataSource: this.getAnnotationSource()
      });
    }
    return annotationExplorer;
  }

  getAnnotationSource() {
    if (!annotationSource) {
      const annotationBackendUrl = getStateStore().getTransient('annotationBackendUrl');
      annotationSource = new AnnotationSource({
        prefix: annotationBackendUrl
      });
    }
    return annotationSource;
  }
}
