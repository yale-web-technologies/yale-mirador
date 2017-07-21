require('../css/main.less');

import './extension/ext-global';
import './extension/ext-hud';
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
    await getAnnotationCache(); // wait for annotation cache to be set up

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

    this._setupAnnotationTocCache();

    const grid = new Grid(this.options.rootElement);
    //const mainMenu = new MainMenu();

    getPageController().init({
      //mainMenu: mainMenu,
      grid: grid,
      settings: settings,
      state: getStateStore()
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

    state.setTransient('tocSpec', settings.tocSpec);
    state.setTransient('tagHierarchy', settings.tagHierarchy);

    state.setTransient('copyrighted', settings.copyrighted);
    state.setTransient('copyrightedImageServiceUrl', settings.copyrightedImageServiceUrl);

    if (settings.ui) {
      state.setBoolean('fixAnnoCellHeight', settings.ui.fixAnnoCellHeight);
      state.setString('textDirection', settings.ui.textDirection);
      state.setTransient('annotationsOverlay', settings.ui.annotationsOverlay);
      state.setTransient('tooltipStyles', settings.ui.tooltipStyles);
      state.setTransient('hideTagsInAnnotation', settings.ui.hideTagsInAnnotation);
    }
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
    const tocSpec = getStateStore().getTransient('tagHierarchy');
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
      const annotationBackendUrl = getStateStore().getTransient('annotationBackendUrl');
      annotationSource = new AnnotationSource({
        prefix: annotationBackendUrl
      });
    }
    return annotationSource;
  }

  getAnnotationTocCache() {
    return this._annotationTocCache;
  }
}
