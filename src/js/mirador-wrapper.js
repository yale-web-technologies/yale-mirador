import getApp from './app';
import getLogger from './util/logger';
import getMiradorProxyManager from './mirador-proxy/mirador-proxy-manager';
import LayoutConfigParser from './layout/layout-config-parser';
import MiradorConfigBuilder from './config/mirador-config-builder';
import {openAnnotationSelector} from './util/annotation-explorer';
import WindowProxy from './mirador-proxy/window-proxy';

const logger = getLogger();
const proxyMgr = getMiradorProxyManager();

/**
 * Wrapper of a single Mirador instance
 */
export default class MiradorWrapper {
  constructor(options) {
    logger.debug('MiradorWrapper#constructor options:', options);
    this.options = Object.assign({
      grid: null,
      miradorOptions: null
    }, options);
    this._miradorId = options.miradorOptions.miradorId;
    this._miradorConfig = this._buildMiradorConfig(options.miradorOptions);
    this._mirador = Mirador(this._miradorConfig);
    this._miradorProxy = this._addToMiradorProxy(this._miradorId, this._mirador);
    this._bindEvents(options.miradorOptions);
  }

  getMirador() {
    return this._mirador;
  }

  getMiradorProxy() {
    return this._miradorProxy;
  }

  getConfig() {
    return this._miradorConfig;
  }

  /**
   * Sets up configuration parameters to pass to Mirador.
   */
  _buildMiradorConfig(options) {
    const builder = new MiradorConfigBuilder(options);
    return builder.buildConfig();
  }

 _addToMiradorProxy(miradorId, mirador) {
    const miradorProxy = proxyMgr.addMirador(miradorId, mirador);

    miradorProxy.subscribe('OPEN_ANNOTATION_SELECTOR',
      (event, windowId, annotationEditor) =>
    {
      openAnnotationSelector(windowId).then((annotation) => {
        annotationEditor.loadAnnotation(annotation);
      });
    });

    return miradorProxy;
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
      jQuery.publish('YM_ADD_WINDOWS', windowsConfig);
    }
  }

  _bindEvents(options) {
    logger.debug('MiradorWrapper#_bindEvents options:', options);
    const miradorProxy = proxyMgr.getMiradorProxy(this._miradorId);

    miradorProxy.subscribe('ANNOTATIONS_LIST_UPDATED', (event, params) => {
      logger.debug('MiradorWrapper#bindEvents received ANNOTATIONS_LIST_UPDATED params:', params);
      const windowProxy = miradorProxy.getWindowProxyById(params.windowId);

      if (!params.options || params.options.eventOriginatorType !== 'AnnotationWindow') {
        // Reload annotation windows
        jQuery.publish('YM_READY_TO_RELOAD_ANNO_WIN', params.windowId);
      }
    });

    miradorProxy.subscribe('YM_CLICKED_OPEN_ANNO_WINDOW', (event, canvasWindowId) => {
      logger.debug('MiradorWrapper received YM_CLICKED_OPEN_ANNO_WINDOW from ', canvasWindowId);
      miradorProxy.publish('YM_DISPLAY_ON');
      this.options.grid.addAnnotationWindow({
        miradorId: this._miradorId,
        imageWindowId: canvasWindowId
      });
    });

    jQuery.subscribe('YM_READY_TO_RELOAD_ANNO_WIN', (event, imageWindowId) => { // after annotations have been loaded
      if (this._urlOptionsProcessed) { // run this function only once
        return;
      } else {
        this._urlOptionsProcessed = true;
        const miradorProxy = proxyMgr.getMiradorProxy(this._miradorId);
        miradorProxy.publish('YM_DISPLAY_ON');
        this._createAnnotationWindows(imageWindowId, options);
      }
    });

    jQuery.subscribe('YM_ANNOTATION_TOC_TAGS_SELECTED', async (evnet, windowId, canvasId, tags) => {
      logger.debug('MiradorWrapper:SUB:YM_ANNOTATION_TOC_TAGS_SELECTED imageWindow:', windowId, 'canvasId:', canvasId, 'tags:', tags);

      const tocCache = getApp().getAnnotationTocCache();
      const toc = await tocCache.getToc(canvasId);
      const miradorProxy = proxyMgr.getMiradorProxy(this._miradorId);
      const windowProxy = miradorProxy.getWindowProxyById(windowId);
      const imageView = windowProxy.getImageView();
      const tocNode = toc.getNodeFromTags(tags);
      const annotation = tocNode.canvasAnnotations[0];
      let newCanvasId = canvasId;

      const zoomToAnnotation = function(event) {
        imageView.zoomToAnnotation(annotation);
        imageView.panToAnnotation(annotation);
        const drawTool = windowProxy.getDrawTool();
        drawTool.updateHighlights(annotation);
        miradorProxy.unsubscribe('annotationsRendered.' + windowId, zoomToAnnotation);
      }

      if (canvasId === windowProxy.getCurrentCanvasId()) {
        zoomToAnnotation();
      } else {
        miradorProxy.subscribe('annotationsRendered.' + windowId, zoomToAnnotation);
        windowProxy.setCurrentCanvasId(canvasId);
      }
    });

     jQuery.subscribe('ANNOWIN_ANNOTATION_CLICKED', (event, params) => {
       const miradorProxy = proxyMgr.getMiradorProxy(this._miradorId);
       const windowProxy = miradorProxy.getWindowProxyById(params.imageWindowId);
       const tocPanel = windowProxy.getSidePanelTabContentElement('ym-annotation-toc');
       const annoTocMenu = tocPanel.data('AnnotationTableOfContent');

       if (annoTocMenu) {
         annoTocMenu.scrollToTags(params.annotation.tocTags);
       }
     });
  }
}
