(function($) {

  $.yaleExt = $.yaleExt || {};

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
  },

  /*
    * Highlight annotated area for annotation focused in annotation window.
    */
  $.OsdRegionDrawTool.prototype.updateHighlights = function(annotation) {
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
  },

  $.OsdRegionDrawTool.prototype.updateHighlightsMulti = function(annotations) {
    for(let shapes of Object.values(this.annotationsToShapesMap)) {
      for (let shape of shapes) {
        for (let annotation of annotations) {
          if (shape.data.annotation['@id'] === annotation['@id']) {
            $.yaleExt.highlightShape(shape);
            shape.bringToFront();
          } else {
            $.yaleExt.deHighlightShape(shape);
            shape.sendToBack();
          }
        }
      }
    }
    //this.osdViewer.forceRedraw();
  };
})(Mirador);
