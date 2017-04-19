(function($) {

  $.yaleExt = $.yaleExt || {};

  /*
   * All functions in this file must be called in the context of
   * an OsdRegionDrawTool so "this" will point to the instance of it.
   */
  jQuery.extend($.yaleExt, {

    /*
     * Get paper.js shapes which are associated with the annotation.
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
    },

    updateHighlightsMulti: function(annotations) {
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
    }

  });

})(Mirador);
