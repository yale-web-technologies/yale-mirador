import {Anno, annoUtil} from './import';
import getApp from './app';
import getLogger from './util/logger';
import getMiradorProxyManager from './mirador-proxy/mirador-proxy-manager';
import LayoutConfigParser from './layout/layout-config-parser';
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
      //await targetWindow.goToAnnotation(annotation['@id'], canvasId); //XXX dealt with by annotation window
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

 /**
   * Optionally create annotations windows after checking parameters.
   * It will examine the parameters and determine how many annotations
   * to create and how to configure them.
   */
  _createAnnotationWindows(imageWindowId, options) {
    const toc = getApp().getAnnotationExplorer().getAnnotationToc();
    const parser = new LayoutConfigParser({
      miradorId: options.miradorId,
      imageWindowId: imageWindowId,
      layerIds: options.layerIds,
      toc: toc,
      tocTags: options.tocTags,
      annotationId: options.annotationId
    });
    const windowsConfig = parser.getWindowsConfig();
    if (windowsConfig) {
      this._miradorProxy.publish('YM_DISPLAY_ON');
      jQuery.publish('YM_ADD_WINDOWS', windowsConfig);
    }
  }

  _processUrlOptions(imageWindowId, options) {
    if (this._urlOptionsProcessed) { // run this function only once
      return;
    } else {
      this._urlOptionsProcessed = true;
      this._createAnnotationWindows(imageWindowId, options);
    }
  }

  _bindEvents(options) {
    logger.debug('PageController#_bindEvents options:', options);
    const _this = this;

    jQuery(window).resize(function() {
      _this.options.grid.resize();
    });

    this._miradorProxy.subscribe('ANNOTATIONS_LIST_UPDATED', (event, params) => {
      logger.debug('PageController:SUB:ANNOTATIONS_LIST_UPDATED params:', params);
      if (this._miradorProxy.shouldIgnoreEvent('ANNOTATIONS_LIST_UPDATED')) {
        this._miradorProxy.unmarkEventToBeIgnored('ANNOTATIONS_LIST_UPDATED');
        return;
      }
      this._processUrlOptions(params.windowId, options);
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

    jQuery.subscribe('ANNOWIN_ANNOTATION_FOCUSED', (event, params) => {
      logger.debug('PageController has received event ANNOWIN_ANNOTATION_FOCUSED with options', params);
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
          logger.error('PageController:SUB:ANNOWIN_ANNOTATION_FOCUSED annotation not found', params.annotation);
        }
      } else { // need to load the canvas that the annotation is targeting
        imageView._annotationToBeFocused = params.annotation;
        this._miradorProxy.markEventToBeIgnored('ANNOTATION_LIST_UPDATED');
        windowProxy.setCurrentCanvasId(params.canvasId);
      }
    });

    jQuery.subscribe('YM_ANNOTATION_TOC_TAGS_SELECTED', async (evnet, windowId, canvasId, tags) => {
      logger.debug('PageController:SUB:YM_ANNOTATION_TOC_TAGS_SELECTED imageWindow:', windowId, 'canvasId:', canvasId, 'tags:', tags);
      const grid = this.options.grid;
      const layerId = this._tocSpec.defaultLayer;
      let annoWindow = grid.getAnnotationWindowByLayer(layerId);

      await this._miradorWrapper.zoomToTags(windowId, canvasId, tags);

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
