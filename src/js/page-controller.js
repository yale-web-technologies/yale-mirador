import {Anno, annoUtil} from './import';
import getApp from './app';
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
 * The page contains Mirador and  surrounding components, e.g., annoatation windows.
 */
class PageController {
  init(options) {
    this.options = jQuery.extend({
      //mainMenu: null,
      grid: null,
      settings: null, // settings retrieved from remote API
      state: null
    }, options);
    logger.debug('PageController#constructor options:', options);

    const miradorOptions = jQuery.extend(this.options.settings, {
      miradorId: Mirador.genUUID(),
      defaultSettings: Mirador.DEFAULT_SETTINGS,
      isEditor: session.isEditor()
    });

    this._miradorWrapper = this._createMirador(miradorOptions);
    this._miradorProxy = this._miradorWrapper.getMiradorProxy();
    this._miradorId = this._miradorProxy.getId();

    this._tocSpec = this.options.state.getTransient('tocSpec');
    this._annotationTocCache = getApp().getAnnotationTocCache();
    this._annotationExplorer = getApp().getAnnotationExplorer();

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
      return new MiradorWrapper({
        grid: this.options.grid,
        miradorOptions: miradorOptions
      });
    } catch(e) {
      const msg = 'PageController#_createMirador ' + e;
      logger.error(msg);
      throw msg;
    }
  }

  async _showAnnotation(windowId, annoId) {
    logger.debug('PageController#showAnnotation windowId:', windowId, 'annoId:' + annoId, 'defaultLayer:', this._tocSpec.defaultLayer);
    const grid = this.options.grid;
    const windowProxy = this._miradorProxy.getWindowProxyById(windowId);
    const canvasId = windowProxy.getCurrentCanvasId();
    const annotations = await this._annotationExplorer.getAnnotations({ canvasId: canvasId });

    let annotation = annotations.filter(anno => anno['@id'] === annoId)[0];
    let layerId = annotation.layerId;

    if (this._tocSpec && this._tocSpec.defaultLayer) {
      const derivedAnnotation = await this._getAnnotationByTagsAndLayer(Anno(annotation).tags,
        this._tocSpec.defaultLayer, canvasId);
      layerId = this._tocSpec.defaultLayer;

      if (derivedAnnotation) {
        annotation = derivedAnnotation;
      } else {
        logger.warning('PageController#_showAnnotation no annotation found for layer', layerId);
      }
    }

    const targetWindow = grid.getAnnotationWindowByLayer(layerId);

    if (targetWindow) {
      //await targetWindow.moveToAnnotation(annotation['@id'], canvasId); //XXX dealt with by annotation window
    } else {
      if (annotation) {
        const annoWindow =  await grid.addAnnotationWindow({
          miradorId: this._miradorId,
          imageWindowId: windowId,
          layerId: layerId,
          annotationId: annotation['@id']
        }).catch(reason => {
          logger.error('PageController#_showAnnotation addAnnotationWindow failed <- ' + reason);
        });
      } else {
        logger.error('PageController#_showAnnotation annotation not found in annotation window, annoId: ' + annotation['@id']);
      }
    }
  }

  async _getAnnotationByTagsAndLayer(tags, layerId, canvasId) {
    const toc = await this._annotationTocCache.getToc(canvasId);
    const tocNode = toc.getNodeFromTags(tags);

    if (!tocNode) {
      logger.warning('PageController#_getAnnotationByTagsAndLayer tocNode not found for tags', tags);
      return null;
    }

    let annos = annoUtil.findAllAnnotationsForTocNode(tocNode)
    .filter(anno => {
      return anno.layerId === layerId;
    });
    return annos[0];
  }

  _bindEvents(options) {
    logger.debug('PageController#_bindEvents options:', options);
    const _this = this;

    jQuery(window).resize(function() {
      _this.options.grid.resize();
    });

   this._miradorProxy.subscribe('YM_IMAGE_WINDOW_TOOLTIP_ANNO_CLICKED', async (event, windowId, annoId) => {
      logger.debug('PageController:SUB:YM_IMAGE_WINDOW_TOOLTIP_ANNO_CLICKED windowId: ' + windowId  + ', annoId: ' + annoId);
      const windowProxy = this._miradorProxy.getWindowProxyById(windowId);
      const canvasId = windowProxy.getCurrentCanvasId();
      const tocPanel = windowProxy.getSidePanelTabContentElement('ym-annotation-toc');
      const annoTocMenu = tocPanel.data('AnnotationTableOfContent');

      this._showAnnotation(windowId, annoId);
      const toc = await this._annotationTocCache.getToc(canvasId);
      const annotation = toc.annotations.filter(anno => anno['@id'] === annoId)[0];

      if (annotation && annoTocMenu) {
        annoTocMenu.scrollToTags(annotation.tocTags);
      }
    });

    jQuery.subscribe('ANNOWIN_ANNOTATION_CLICKED', (event, params) => {
      logger.debug('PageController has received event ANNOWIN_ANNOTATION_CLICKED with options', params);
      const windowProxy = this._miradorProxy.getWindowProxyById(params.imageWindowId);
      const imageView = windowProxy.getImageView();
      const annoMap = {};

      if (params.canvasId === windowProxy.getCurrentCanvasId()) { // the clicked annotation belong to the current canvas
        for (let anno of windowProxy.getAnnotationsList()) {
          annoMap[anno['@id']] = anno;
        }
        let anno = params.annotation;

        if (!annoUtil.hasTargetOnCanvas(anno)) {
          let annos = annoUtil.findTargetAnnotationsOnCanvas(anno, annoMap);
          anno = annos[0];
        }
        if (anno) {
          imageView.zoomToAnnotation(anno);
          imageView.panToAnnotation(anno);
          imageView.annotationsLayer.drawTool.updateHighlights(anno);
        } else {
          logger.error('PageController:SUB:ANNOWIN_ANNOTATION_CLICKED annotation not found', params.annotation);
        }
      } else { // need to load the canvas that the annotation is targeting
        imageView._annotationToBeFocused = params.annotation;
        windowProxy.setCurrentCanvasId(params.canvasId, {
          eventOriginatorType: 'AnnotationWindow',
        });
      }
    });

    jQuery.subscribe('YM_ANNOTATION_TOC_TAGS_SELECTED', async (evnet, windowId, canvasId, tags) => {
      logger.debug('PageController:SUB:YM_ANNOTATION_TOC_TAGS_SELECTED imageWindow:', windowId, 'canvasId:', canvasId, 'tags:', tags);
      const grid = this.options.grid;
      const layerId = this._tocSpec.defaultLayer;
      let annoWindow = grid.getAnnotationWindowByLayer(layerId);

      if (!annoWindow) {
        annoWindow =  await grid.addAnnotationWindow({
          miradorId: this._miradorId,
          imageWindowId: windowId,
          layerId: layerId,
          tocTags: tags
        }).catch(reason => {
          logger.error('PageController#_showAnnotation addAnnotationWindow failed <- ' + reason);
        });
      }
    });
  }
}
