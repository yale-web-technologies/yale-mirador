import getLogger from '../util/logger';

(function($) {
  
  $.yaleExt = $.yaleExt || {};
  
  const logger = getLogger();
  
  /*
   * Functions in this file must be called in the context of an ImageView 
   * so "this" will point to the instance of the image view.
   */
  jQuery.extend($.yaleExt, {
    
    zoomToAnnotation: function(annotation) {
      const viewport = this.osd.viewport;
      const currentZoom = viewport.getZoom();
      logger.debug('panToAnnotation zoom: ' + currentZoom);
      const shapes = $.yaleExt.getShapesForAnnotation.call(this.annotationsLayer.drawTool, annotation);
      const shapeBounds = $.yaleExt.getCombinedBounds(shapes); // in image coordinates
      const shapeWH = viewport.imageToViewportCoordinates(shapeBounds.width, shapeBounds.height);
      const viewportBounds = viewport.getBounds();
      const widthRatio = shapeWH.x / viewportBounds.width;
      logger.debug('w ratio: ' + widthRatio);
      const heightRatio = shapeWH.y / viewportBounds.height;
      logger.debug('h ratio: ' + heightRatio);
      const zoomFactor = 1.0 / Math.max(widthRatio, heightRatio) * 0.75;
      logger.debug('zoomFactor: ' + zoomFactor);
      
      viewport.zoomBy(zoomFactor);
    },

    /*
     * Highlight the boundaries for the currently chosen annotation
     * and pan to show the annotated area.
     */ 
    panToAnnotation: function(annotation) {
      var viewport = this.osd.viewport;
      var shapes = $.yaleExt.getShapesForAnnotation.call(this.annotationsLayer.drawTool, annotation);
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

      if (panX !== 0 || panY !== 0) {
        viewport.panBy(new OpenSeadragon.Point(panX, panY));
      }
    }
    
  });
  
})(Mirador);
