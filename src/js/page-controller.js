import {annoUtil} from './import';
import getLogger from './util/logger';
import getMiradorProxyManager from './mirador-proxy/mirador-proxy-manager';
import MiradorWrapper from './mirador-wrapper';
import session from './session';

export default function getPageController() {
  if (!instance) {
    instance = new PageController();
  }
  return instance;
};

let instance = null;
let logger = getLogger();

/**
 * Code for the HTML page that hosts Mirador instance(s)
 */
class PageController {
  init(options) {
    this.options = jQuery.extend({
      //mainMenu: null,
      grid: null,
      settings: null // settings retrieved from remote API
    }, options);
    logger.debug('PageController#constructor options:', options);

    const miradorOptions = jQuery.extend(this.options.settings, {
      miradorId: Mirador.genUUID(),
      defaultSettings: Mirador.DEFAULT_SETTINGS,
      isEditor: session.isEditor()
    });

    this._createMirador(miradorOptions);
    this._bindEvents(miradorOptions);
  }

  // TODO: make it per Mirador instance
  getConfig() {
    return this.miradorWrapper.getConfig();
  }

  _createMirador(miradorOptions) {
    try {
      // Should create a container in the grid first before instantiating Mirador
      this.options.grid.addMiradorWindow(miradorOptions.miradorId);
      this.miradorWrapper = new MiradorWrapper({
        grid: this.options.grid,
        miradorOptions: miradorOptions
      });
    } catch(e) {
      const msg = 'PageController#_createMirador ' + e;
      logger.error(msg);
      throw msg;
    }
  }

  _bindEvents(options) {
    logger.debug('PageController#_bindEvents options:', options);
    const _this = this;

    jQuery(window).resize(function() {
      _this.options.grid.resize();
    });

    jQuery.subscribe('ANNOWIN_ANNOTATION_CLICKED', (event, params) => {
      logger.debug('PageController has received event ANNOWIN_ANNOTATION_CLICKED with options', params);
      const windowProxy = getMiradorProxyManager().getWindowProxyById(params.imageWindowId);
      const imageView = windowProxy.getImageView();
      const annoMap = {};

      if (params.canvasId === windowProxy.getCurrentCanvasId()) { // the clicked annotation belong to the current canvas
        for (let anno of windowProxy.getAnnotationsList()) {
          annoMap[anno['@id']] = anno;
        }
        let anno = params.annotation;

        if (!annoUtil.hasTargetOnCanvas(anno)) {
          let annos = annoUtil.findTargetAnnotationsOnCanvas(anno, annoMap);
          console.log('H1 annos', annos);
          anno = annos[0];
        }
        if (anno) {
          imageView.zoomToAnnotation(anno);
          imageView.panToAnnotation(anno);
          imageView.annotationsLayer.drawTool.updateHighlights(anno);
        } else {
          logger.error('PageController:SUB:ANNOWIN_ANNOTATION_CLICKED annotation not found');
        }
      } else { // need to load the canvas that the annotation is targeting
        imageView._annotationToBeFocused = params.annotation;
        windowProxy.setCurrentCanvasId(params.canvasId, {
          eventOriginatorType: 'AnnotationWindow',
        });
      }
    });
  }
}
