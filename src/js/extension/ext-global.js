import getLogger from '../util/logger';

(function($) {
  
  $.yaleExt = $.yaleExt || {};
  
  const logger = getLogger();
  
  jQuery.extend($.yaleExt, {

    // Get bounds of multiple paper.js shapes.
    getCombinedBounds: function (shapes) {
      logger.debug('shapes: ' + shapes);
      var bounds = null;
      jQuery.each(shapes, function (index, shape) {
        if (bounds) {
          bounds = bounds.unite(shape.strokeBounds);
        } else {
          bounds = shape.strokeBounds;
        }
        logger.debug('index: ' + index + ', bounds: ' + bounds);
      });
      return bounds;
    },
    
    highlightShape: function (shape) {
      if (!shape._ym_oldStrokeColor) {
        shape.data._ym_oldStrokeColor = shape.strokeColor;
      }
      if (!shape._ym_oldStrokeWdth) {
        shape.data._ym_oldStrokeWidth = shape.data.currentStrokeValue;
      }
      shape.data.currentStrokeValue = 2;
      shape.set({ opacity: 1 });
    },
    
    deHighlightShape: function (shape) {
      if (shape.data._ym_oldStrokeColor) {
        shape.set({ strokeColor: shape.data._ym_oldStrokeColor });
      }
      if (shape.data._ym_oldStrokeWidth) {
        shape.data.currentStrokeValue = shape.data._ym_oldStrokeWidth;
      }
      shape.opacity = 0;
    }
    
  });
  
})(Mirador);
