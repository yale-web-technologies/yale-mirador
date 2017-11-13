require('../css/main.less');

import './extension/main';
import {AnnotationExplorer, annoUtil} from './import';
import AnnotationSource from './annotation-data/annotation-source';
import AnnotationTocCache from './annotation-data/annotation-toc-cache';
import fatalError from './util/fatal-error';
import getAnnotationCache from './annotation-data/annotation-cache';
import getConfigFetcher from './config/config-fetcher';
import getLogger from './util/logger';
import getPageController from './page-controller';
import getStateStore from './state-store';
import Grid from './layout/grid';
//import 'util/jquery-tiny-pubsub-trace'; // import this only for debugging!

const logger = getLogger();
let instance = null;
let annotationExplorer = null;
let annotationSource = null;


export class App {
  constructor() {
    this._setupLogger();
    this._state = getStateStore();
    this.initHandlebars();
  }

  async init(settings) {
    logger.debug('App#init settings:', settings);
    await this.initState(settings);
    await getAnnotationCache(); // wait for annotation cache to be set up
    this._preConfigureTinyMce(settings.mirador.buildPath + '/');
    this._setupAnnotationTocCache();
    const grid = new Grid(settings.ui.rootElementId);

    this._pageController = getPageController();
    this._pageController.init({
      grid: grid,
      appSettings: settings,
      appState: this._state
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
    const state = this._state;
    state.init(settings);

    const explorer = this.getAnnotationExplorer();
    const layers = await explorer.getLayers();
    state.setTransient('annotationLayers', layers);
  }

  _setupLogger() {
    if (window.location.hash === '#debug') {
      logger.setLogLevel(logger.DEBUG);
    } else {
      logger.setLogLevel(logger.INFO);
    }
    annoUtil.setLogger(logger);
  }

  _preConfigureTinyMce(miradorBuildPath) {
    logger.debug('App#preConfigureTinyMce buildPath:', miradorBuildPath);
    tinymce.base = miradorBuildPath + '/';
    tinymce.setup();
  }

  _setupAnnotationTocCache() {
    const tocSpec = this._state.getSetting('annotations', 'tocSpec');
    if (tocSpec) {
      this._annotationTocCache = new AnnotationTocCache({
        tocSpec: tocSpec,
        annotationExplorer: this.getAnnotationExplorer()
      });
    } else {
      this._annotationTocCache = null;
    }
  }

  getAnnotationExplorer() {
    if (!annotationExplorer) {
      annotationExplorer = new AnnotationExplorer({
        dataSource: this.getAnnotationSource(),
        logger: logger
      });
    }
    return annotationExplorer;
  }

  getAnnotationSource() {
    if (!annotationSource) {
      const annoStoreUrl = this._state.getSetting('annotations', 'store');
      annotationSource = new AnnotationSource({
        prefix: annoStoreUrl,
        state: this._state
      });
    }
    return annotationSource;
  }

  getAnnotationTocCache() {
    return this._annotationTocCache;
  }
}

export const getApp = () => {
  if (!instance) {
    instance = new App();
  }
  return instance;
};

export default getApp;
