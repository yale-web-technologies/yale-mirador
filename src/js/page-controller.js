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

    this._tocSpec = this.options.state.getSetting('annotations', 'tocSpec');
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

  /**
   * Show annotation in annotation window
   */
  async _showAnnotation(windowId, annoId) {
    logger.debug('PageController#showAnnotation windowId:', windowId, 'annoId:' + annoId,
      'defaultLayer:', this._tocSpec ? this._tocSpec.defaultLayer : null);
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

    if (!targetWindow) {
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
    logger.debug('PageController#_createAnnotationWindows windowsConfig:', windowsConfig);
    if (windowsConfig) {
      this._miradorProxy.publish('YM_DISPLAY_ON');
      jQuery.publish('YM_ADD_WINDOWS', windowsConfig);
    }
  }

  _processUrlOptions(imageWindowId, options) {
    logger.debug('PageController#_processUrlOptions imageWindowId:', imageWindowId, 'options:', options, '_urlOptionsProcessed:', this._urlOptionsProcessed);
    if (this._urlOptionsProcessed) { // run this function only once
      return;
    } else {
      this._urlOptionsProcessed = true;

      if (this.options.state.getSetting('mirador', 'annotationsOverlay', 'showByDefault') ||
        options.annotationId)
      {
        this._miradorProxy.publish('YM_DISPLAY_ON');
      }

      if (options.annotationId) {
        const handler = event => {
          logger.debug('PageController#_processUrlOptions annotationsRendered');
          this._zoomToAnnotation(options.annotationId, imageWindowId);
          this._miradorProxy.unsubscribe('annotationsRendered.' + imageWindowId, handler);
        }
        this._miradorProxy.subscribe('annotationsRendered.' + imageWindowId, handler);
      }
      this._createAnnotationWindows(imageWindowId, options);
    }
  }

  _findCanvasAnnotationsFromTargets(sourceAnnotation, allAnnotations, canvasId) {
    logger.debug('PageController#_findCanvasAnnotationsFromTargets sourceAnnotation:', sourceAnnotation, 'allAnnotations:', allAnnotations, 'canvasId:', canvasId);
    const annoMap = {};
    for (let anno of allAnnotations) {
      annoMap[anno['@id']] = anno;
    }
    return annoUtil.findTransitiveTargetAnnotations(sourceAnnotation, annoMap)
    .filter(anno => {
      for (let target of Anno(anno).targets) {
        if (target.full === canvasId) {
          return true;
        }
      }
    });
  }

  _zoomToAnnotation(annotationId, imageWindowId) {
    const imageWindowProxy = this._miradorProxy.getWindowProxyById(imageWindowId);
    const imageView = imageWindowProxy.getImageView();
    const canvasId = imageWindowProxy.getCurrentCanvasId();
    const allAnnotations = imageWindowProxy.getAnnotationsList();
    let annos = allAnnotations.filter(anno => anno['@id'] === annotationId);
    annos = this._findCanvasAnnotationsFromTargets(annos[0], allAnnotations, canvasId);

    if (annos.length > 0) {
      if (annos.length > 1) {
        logger.error('PageController#_zoomToAnnotation', annos.length, 'duplicate annos:', annos, 'imageWindowId:', imageWindowId);
      }
      logger.debug('PageController#_zoomToAnnotation canvas annos:', annos);
      imageView.zoomToAnnotation(annos[0]);
      imageView.panToAnnotation(annos[0]);
      imageView.annotationsLayer.drawTool.updateHighlights(annos[0]);
    } else {
      logger.error('PageController#_zoomToAnnotation annotation not found: annotationId:', annotationId, 'imageWindowId:', imageWindowId);
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

      if (annoTocMenu) {
        const toc = await this._annotationTocCache.getToc(canvasId);
        const annotation = toc.annotations.filter(anno => anno['@id'] === annoId)[0];

        if (annotation) {
          annoTocMenu.scrollToTags(annotation.tocTags);
        }
      }
    });

    jQuery.subscribe('ANNOWIN_ANNOTATION_FOCUSED', (event, params) => {
      logger.debug('PageController has received event ANNOWIN_ANNOTATION_FOCUSED with options', params);
      const windowProxy = this._miradorProxy.getWindowProxyById(params.imageWindowId);
      const canvasId = windowProxy.getCurrentCanvasId();
      const imageView = windowProxy.getImageView();
      const annotations = windowProxy.getAnnotationsList();
      const annoMap = {};

      if (params.canvasId === windowProxy.getCurrentCanvasId()) { // the clicked annotation belong to the current canvas
        for (let anno of annotations) {
          annoMap[anno['@id']] = anno;
        }
        let anno = params.annotation;

        if (!annoUtil.hasTargetOnCanvas(anno)) {
          let annos = this._findCanvasAnnotationsFromTargets(anno, annotations, canvasId)
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
        windowProxy.setCurrentCanvasId(params.canvasId);
      }
    });

    jQuery.subscribe('YM_ANNOTATION_TOC_TAGS_SELECTED', async (evnet, windowId, canvasId, tags) => {
      logger.debug('PageController:SUB:YM_ANNOTATION_TOC_TAGS_SELECTED imageWindow:', windowId, 'canvasId:', canvasId, 'tags:', tags);
      const grid = this.options.grid;
      const layerId = this._tocSpec.defaultLayer;
      let annoWindow = grid.getAnnotationWindowByLayer(layerId);

      try {
        this._miradorProxy.publish('YM_DISPLAY_ON');
        // Give some time for displayOn to run
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve();
          }, 0);
        });
      } catch(e) {
        logger.error('PageController#SUB:YM_ANNOTATION_TOC_TAGS_SELECTED failed to enable annotation layer');
      }

      const annotationWindows = this.options.grid.getAnnotationWindows();
      for (let annoWin of Object.values(annotationWindows)) {
        annoWin.ignoreEvent('ANNOTATIONS_LIST_UPDATED', 35000);
      }

      await this._miradorWrapper.zoomToTags(windowId, canvasId, tags).catch(reason => {
        logger.error('PageController:SUB:YM_ANNOTATION_TOC_TAGS_SELECTED zoomToTags failed:', reason);
      });

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
