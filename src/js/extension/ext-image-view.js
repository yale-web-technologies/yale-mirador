import {Anno, annoUtil} from '../import';
import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';

(function($) {

  $.yaleExt = $.yaleExt || {};

  const logger = getLogger();

  $.ImageView.prototype.enableAnnotationLayer = function() {
    this.annotationState = 'on';
  };

  $.ImageView.prototype.zoomToAnnotation = function(annotation) {
    logger.debug('ImageView(ext)#zoomToAnnotation annotation:', annotation);
    const viewport = this.osd.viewport;
    const currentZoom = viewport.getZoom();
    //logger.debug('zoomToAnnotation zoom: ' + currentZoom);
    const shapes = this.annotationsLayer.drawTool.getShapesForAnnotation(annotation);
    const shapeBounds = $.yaleExt.getCombinedBounds(shapes); // in image coordinates
    const shapeWH = viewport.imageToViewportCoordinates(shapeBounds.width, shapeBounds.height);
    const viewportBounds = viewport.getBounds();
    const widthRatio = shapeWH.x / viewportBounds.width;
    //logger.debug('w ratio: ' + widthRatio);
    const heightRatio = shapeWH.y / viewportBounds.height;
    //logger.debug('h ratio: ' + heightRatio);
    const zoomFactor = 1.0 / Math.max(widthRatio, heightRatio) * 0.75;
    //logger.debug('zoomFactor: ' + zoomFactor);

    if (typeof zoomFactor === 'number' && !isNaN(zoomFactor)) {
      viewport.zoomBy(zoomFactor);
    } else {
      const msg = 'ImageView(ext)#zoomToAnnotation invalid zoomFactor ' + zoomFactor;
      logger.error(msg, annotation);
      throw msg;
    }
  };

  /*
    * Highlight the boundaries for the currently chosen annotation
    * and pan to show the annotated area.
    */
  $.ImageView.prototype.panToAnnotation = function(annotation) {
    logger.debug('ImageView(ext)#panToAnnotation anno:', annotation);
    var viewport = this.osd.viewport;
    var shapes = this.annotationsLayer.drawTool.getShapesForAnnotation(annotation);
    var shapeBounds = $.yaleExt.getCombinedBounds(shapes); // in image coordinates
    var x = shapeBounds.x + shapeBounds.width / 2;
    var y = shapeBounds.y + shapeBounds.height / 2;
    var p = new OpenSeadragon.Point(x, y);

    var shapeXY = viewport.imageToViewportCoordinates(shapeBounds.x, shapeBounds.y);
    var shapeWH = viewport.imageToViewportCoordinates(shapeBounds.width, shapeBounds.height);
    var shapeLeft = shapeXY.x;
    var shapeRight = shapeXY.x + shapeWH.x;
    var shapeTop = shapeXY.y;
    var shapeBottom = shapeXY.y + shapeWH.y;

    var viewportBounds = viewport.getBounds();
    var viewportHeight = viewport.getHomeBounds().height;

    var visibleLeft = viewportBounds.x;
    var visibleRight = viewportBounds.x + viewportBounds.width;
    var visibleTop = viewportBounds.y;
    var visibleBottom = viewportBounds.y + viewportBounds.height;

    var padding = 0.08 / viewport.getZoom();
    var panX = 0;
    var panY = 0;

    if (shapeRight + padding > visibleRight) { // right side hidden
      if (shapeLeft - padding < visibleLeft) { // right hidden, left hidden
        panX = shapeLeft - padding - visibleLeft;
      } else { // right hidden, left not hidden
        panX  = shapeRight + padding - visibleRight;
        if (shapeLeft - panX - padding < visibleLeft) { // left hidden if panned
          panX -= visibleLeft - (shapeLeft - panX - padding);
        }
      }
    } else if (shapeLeft - padding < visibleLeft) { // left hidden, right not hidden
      panX = shapeLeft - padding - visibleLeft;
    }

    if (shapeBottom + padding > visibleBottom) { // bottom side hidden
      if (shapeTop - padding < visibleTop) { // bottom hidden, top hidden
        panY = shapeTop - padding - visibleTop;
      } else { // right hidden, left not hidden
        panY  = shapeBottom + padding - visibleBottom;
        if (shapeTop - panY - padding < visibleTop) { // top hidden if panned
          panY -= visibleTop - (shapeTop - panY - padding);
        }
      }
    } else if (shapeTop - padding < visibleTop) { // top hidden, bottom not hidden
      panY = shapeTop - padding - visibleTop;
    }

    if (typeof panX === 'number' && !isNaN(panX) && typeof panY === 'number' && !isNaN(panY)) {
      viewport.panBy(new OpenSeadragon.Point(panX, panY));
    } else {
      const msg = 'ImageView(ext)#panToAnnotation invalid value(s) panX: ' + panX + ', panY: ' + panY;
      logger.error(msg, annotation);
      throw msg;
    }
  };

  const _listenForActions = $.ImageView.prototype.listenForActions;

  $.ImageView.prototype.listenForActions = function() {
    _listenForActions.call(this);

    this.eventEmitter.subscribe('ANNOTATIONS_LIST_UPDATED', event => {
      logger.debug('ImageView(ext):SUB:ANNOTATIONS_LIST_UPDATED window:', this.windowId, 'annotationToBeFocused:', this._annotationToBeFocused);

      if (this._annotationToBeFocused) {
        // setTimeout in order to give the OsdRegionDrawTool time to create
        // annotation shapes in the overlay after window.getAnnotations() is done
        setTimeout(() => {
          const imageWindowProxy = getMiradorProxyManager().getWindowProxyById(this.windowId);
          let anno = this._annotationToBeFocused;

          if (!annoUtil.hasTargetOnCanvas(anno)) {
            const annoMap = {};
            for (let anno of imageWindowProxy.getAnnotationsList()) {
              annoMap[anno['@id']] = anno;
            }
            anno = annoUtil.findTransitiveTargetAnnotations(anno, annoMap)
            .filter(anno => {
              for (let target of Anno(anno).targets) {
                if (target.full === imageWindowProxy.getCurrentCanvasId()) {
                  return true;
                }
              }
              return false;
            })[0];
          }
          this._annotationToBeFocused = null;
          if (anno) {
            this.zoomToAnnotation(anno);
            this.panToAnnotation(anno);
            this.annotationsLayer.drawTool.updateHighlights(anno);
          } else {
            logger.error('ImageWindow(ext):SUB:ANNOTATIONS_LIST_UPDATED annotation not found');
          }
        }, 500);
      }
    });

    this.eventEmitter.subscribe('YM_DISPLAY_ON', event => {
      logger.debug('ExtImageView:SUB:YM_DISPLAY_ON');
      if (this.hud.annoState.current === 'off') {
        this.hud.annoState.displayOn(this.element.find('.mirador-osd-annotations-layer'));
      }
    });
  };

})(Mirador);
