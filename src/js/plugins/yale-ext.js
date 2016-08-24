(function($) {
  
  $.yaleExt = {

    // Get bounds of multiple paper.js shapes.
    getCombinedBounds: function (shapes) {
      console.log('shapes: ' + shapes);
      var bounds = null;
      jQuery.each(shapes, function (index, shape) {
        if (bounds) {
          bounds = bounds.unite(shape.strokeBounds);
        } else {
          bounds = shape.strokeBounds;
        }
        console.log('index: ' + index + ', bounds: ' + bounds);
      });
      return bounds;
    },
    
    highlightShape: function (shape) {
      if (!shape._ym_oldStrokeColor) {
        shape._ym_oldStrokeColor = shape.strokeColor;
      }
      if (!shape._ym_oldStrokeWdth) {
        shape._ym_oldStrokeWidth = shape.strokeWidth;
      }
      shape.set({ 
        //strokeColor: 'yellow',
        strokeWidth: 30,
        opacity: 1 
      });
    },
    
    deHighlightShape: function (shape) {
      if (shape._ym_oldStrokeColor) {
        shape.set({ strokeColor: shape._ym_oldStrokeColor });
      }
      if (shape._ym_oldStrokeWidth) {
        shape.set({ strokeWidth: shape._ym_oldStrokeWidth });
      }
      shape.opacity = 0;
    },
    
    /*
     * Highlight the boundaries for the currently chosen annotation
     * and pan to show the annotated area.
     * Must be called in the context of an ImageView so "this" will point to the instance of
     * the image view.
     */ 
    panToAnnotation: function(annotation) {
      var viewport = this.osd.viewport;
      var shapes = $.yaleExt.getShapesForAnnotation.call(this.annotationsLayer.drawTool, annotation);
      var shapeBounds = $.yaleExt.getCombinedBounds(shapes); // in image coordinates
      var annoWidth = shapeBounds.width;
      var annoHeight = shapeBounds.height;
      var x = shapeBounds.x + annoWidth / 2;
      var y = shapeBounds.y + annoHeight / 2;
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

      var padding = 0.05 / viewport.getZoom();
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
    },
    
    /*
     * Get paper.js shapes which are associated with the annotation.
     * Must be called in the context of an OsdRegionDrawTool so "this" will
     * point an instance of it.
     */
    getShapesForAnnotation: function(annotation) {
      var out_shapes = [];
      jQuery.each(this.annotationsToShapesMap, function(key, shapes) {
        jQuery.each(shapes, function (index, shape) {
          if (shape.data.annotation['@id'] === annotation['@id']) {
            out_shapes.push(shape);
          }
        });
      });
      return out_shapes;
    },
    
    /*
     * Highlight annotated area for annotation focused in annotation window.
     * Must be called in the context of an OsdRegionDrawTool so "this" will
     * point an instance of it.
     */
    updateHighlights: function(annotation) {
      jQuery.each(this.annotationsToShapesMap, function(key, shapes) {
        jQuery.each(shapes, function (index, shape) {
          if (shape.data.annotation['@id'] === annotation['@id']) {
            $.yaleExt.highlightShape(shape);
            shape.bringToFront();
          } else {
            $.yaleExt.deHighlightShape(shape);
            shape.sendToBack();
          }
        });
      });
      this.osdViewer.forceRedraw();
    }

  };
  
})(Mirador);
