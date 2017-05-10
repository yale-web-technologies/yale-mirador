import getLogger from '../util/logger';
import getStateStore from '../state-store';

(function($) {
  const logger = getLogger();

  /*
    * Get paper.js shapes which are associated with the annotation.
    */
  $.OsdRegionDrawTool.prototype.getShapesForAnnotation = function(annotation) {
    var out_shapes = [];
    jQuery.each(this.annotationsToShapesMap, function(key, shapes) {
      jQuery.each(shapes, function (index, shape) {
        if (shape.data.annotation['@id'] === annotation['@id']) {
          out_shapes.push(shape);
        }
      });
    });
    return out_shapes;
  };

  $.OsdRegionDrawTool.prototype.saveStrokeColor = function(shape) {
    if (!shape.data._ym_defaultStrokeColor) {
      shape.data._ym_defaultStrokeColor = shape.strokeColor;
    }
  };

  $.OsdRegionDrawTool.prototype.saveStrokeWidth = function(shape) {
    if (!shape.data._ym_defaultStrokeWidth) {
      shape.data._ym_defaultStrokeWidth = shape.data.strokeWidth;
    }
  };

  $.OsdRegionDrawTool.prototype.getDefaultStrokeWidth = function(shape) {
    if (typeof shape.data._ym_defaultStrokeWidth === 'number') {
      return shape.data._ym_defaultStrokeWidth;
    } else {
      return shape.data.strokeWidth;
    }
  };

  /*
    * Highlight annotated area for annotation focused in annotation window.
    */
  $.OsdRegionDrawTool.prototype.updateHighlights = function(annotation) {
    const _this = this;
    jQuery.each(this.annotationsToShapesMap, function(key, shapes) {
      jQuery.each(shapes, function (index, shape) {
        if (shape.data.annotation['@id'] === annotation['@id']) {
          _this.highlightShape(shape);
          shape.bringToFront();
        } else {
          _this.deHighlightShape(shape);
          shape.sendToBack();
        }
      });
    });
    this.osdViewer.forceRedraw();
  };

  $.OsdRegionDrawTool.prototype.updateShapesVisibility = function(annotations) {
    for(let shapes of Object.values(this.annotationsToShapesMap)) {
      for (let shape of shapes) {
        for (let annotation of annotations) {
          if (shape.data.annotation['@id'] === annotation['@id']) {
            //this.highlightShape(shape);
            shape.bringToFront();
            shape.opacity = 1;
          } else {
            //this.deHighlightShape(shape);
            shape.sendToBack();
            const settings = getStateStore().getTransient('annotationsOverlay');
            if (settings && settings.hideUnfocused) {
              shape.opacity = 0;
            } else {
              shape.opacity = 1;
            }
          }
        }
      }
    }
  };

  $.OsdRegionDrawTool.prototype.highlightShape = function(shape) {
    logger.debug('highlightShape', shape);
    this.saveStrokeColor(shape);
    this.saveStrokeWidth(shape);

    const setting = getStateStore().getTransient('annotationsOverlay');
    if (setting) {
      if (setting.hoverColor) {
        shape.strokeColor = setting.hoverColor;
      }
      if (setting.hoverWidthFactor) {
        const defaultWidth = shape.data._ym_defaultStrokeWidth;
        console.log('default width', defaultWidth);
        shape.data.strokeWidth = setting.hoverWidthFactor *
          (typeof defaultWidth === 'number' ? defaultWidth : shape.data.strokeWidth);
      }
    }
    shape.set({ opacity: 1 });
  },

  $.OsdRegionDrawTool.prototype.deHighlightShape = function(shape) {
    logger.debug('deHighlightShape', shape);

    if (shape.data._ym_defaultStrokeColor) {
      shape.strokeColor = shape.data._ym_defaultStrokeColor;
    }

    if (shape._ym_defaultStrokeWidth) {
      shape.data.strokeWidth = shape._ym_defaultStrokeWidth;
    }

    const settings = getStateStore().getTransient('annotationsOverlay');
    if (settings && settings.hideUnfocused) {
      shape.opacity = 0;
    } else {
      shape.opacity = 1;
    }
  };

})(Mirador);
