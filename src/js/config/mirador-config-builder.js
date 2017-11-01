import AnnotationSource from '../annotation-data/annotation-source';
import getLogger from '../util/logger';
import getStateStore from '../state-store';
import Locales from '../config/locales';

const logger = getLogger();

export default class MiradorConfigBuilder {
  constructor(options) {
    logger.debug('MiradorConfigBuilder#constructor options:', options);
    this._options = options;
    this._state = getStateStore();

    const window = this._state.getSetting('initialLayout', 'windows')[0];
    this._manifestUri = window.manifest;
    this._canvasId = window.canvas;
  }

  buildConfig() {
    const config = jQuery.extend(true, {}, this._options.defaultSettings);
    const tocSpec = this._state.getSetting('annotations', 'tocSpec');

    jQuery.extend(config, {
      id: this._options.miradorId,
      buildPath: this._options.mirador.buildPath || '/',
      i18nPath: '/locales/',
      imagesPath: '/images/',
      logosPath: '/images/logos/',
      mainMenuSettings: { show: false },
      data: [{ manifestUri: this._manifestUri }],
      windowObjects: [this.windowObject()],
      autoHideControls: false, // autoHide is bad for touch-only devices
      annotationEndpoint: this.endPointConfig(),
      annotationBodyEditor: {
        module: 'AnnotationEditor',
        options: {
          miradorDriven: true,
          mode: 'create'
        }
      },
      i18nAdditions: new Locales().getLocalesConfig(this._options)
    });

    const windowSettings = config.windowSettings;

    windowSettings.displayLayout = false;

    if (tocSpec) {
      windowSettings.sidePanelOptions.annotationTocTabAvailable = true;
      windowSettings.sidePanelOptions.tocTabAvailable = false;
    }

    if (!this._state.getSetting('auth', 'isEditor')) {
      windowSettings.canvasControls.annotations.annotationCreation = false;
    }

    if (this._state.getSetting('mirador', 'annotationsOverlay', 'showByDefault')) {
      windowSettings.canvasControls.annotations.annotationState = 'on';
    }

    const hoverColor = this._state.getSetting('mirador', 'annotationsOverlay','hoverColor');
    const hoverWidthFactor = this._state.getSetting('mirador', 'annotationsOverlay','hoverWidthFactor');

    if (hoverColor) {
      config.drawingToolsSettings.hoverColor = hoverColor;
    }
    if (hoverWidthFactor) {
      config.drawingToolsSettings.hoverWidthFactor = hoverWidthFactor;
    }

    logger.debug('MiradorConfigBuilder#buildConfig config:', config);
    return config;
  }

  windowObject() {
    const windowObject = {
      loadedManifest: this._manifestUri,
      bottomPanelVisible: false
    };
    if (this._canvasId) { // if instructed to load a specific canvas
      windowObject.canvasID = this._canvasId;
    }
    return windowObject;
  }

  endPointConfig() {
    return {
      name: 'Yale Annotations',
      module: 'YaleEndpoint',
      dataSource: AnnotationSource,
      options: { prefix: this._options.endpointUrl }
    };
  }
}
