import AnnotationSource from '../annotation-data/annotation-source';
import AnnotationSourceFb from '../annotation-data/annotation-source-fb';
import getLogger from '../util/logger';

export default class MiradorConfigBuilder {
  constructor(options) {
    this.options = jQuery.extend({
      buildPath: null,
      canvasId: null,
      defaultSettings: null, // Mirador default settings
      disableAuthz: false,
      endpointUrl: null,
      projectId: null,
      isEditor: false,
      manifestUri: null,
      miradorId: null, // ID of Mirador instance
      tagHierarchy: null
    }, options);
    this.logger = getLogger();
  }

  buildConfig() {
    const config = jQuery.extend(true, {}, this.options.defaultSettings);

    jQuery.extend(config, {
      id: this.options.miradorId,
      buildPath: this.options.buildPath || '/',
      i18nPath: '/locales/',
      imagesPath: '/images/',
      logosPath: '/images/logos/',
      mainMenuSettings: { show: false },
      data: [{ manifestUri: this.options.manifestUri }],
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
      extension: {
        tagHierarchy: this.options.tagHierarchy || null,
        projectId: this.options.projectId || null,
        firebase: this.options.firebase || null,
        disableAuthz: this.options.disableAuthz || false
      }
    });

    config.windowSettings.displayLayout = false;

    if (!this.options.isEditor) {
      config.windowSettings.canvasControls.annotations.annotationCreation = false;
    }
    config.windowSettings.canvasControls.annotations.annotationState = 'on';

    this.logger.debug('MiradorConfigBuilder#buildConfig config:', config);
    return config;
  }

  windowObject() {
    const windowObject = {
      loadedManifest: this.options.manifestUri,
      bottomPanelVisible: false
    };
    if (this.options.canvasId) { // if instructed to load a specific canvas
      windowObject.canvasID = this.options.canvasId;
    }
    return windowObject;
  }

  endPointConfig() {
    if (this.options.endpointUrl === 'firebase') {
      return {
        name: 'Yale (Firebase) Annotations',
        module: 'YaleEndpoint',
        dataSource: AnnotationSourceFb,
        options: {}
      };
    } else {
      return {
        name: 'Yale Annotations',
        module: 'YaleEndpoint',
        dataSource: AnnotationSource,
        options: { prefix: this.options.endpointUrl }
      };
    }
  }
}
