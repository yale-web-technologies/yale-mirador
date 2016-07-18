export default {
  
  /**
   * Returns content of first text (non-tag) resource it finds from the annotation.
   */
  getAnnotationText: function(annotation) {
    var content = null;
    var resource = annotation.resource;
    
    if (!(resource instanceof Array || resource instanceof Object)) {
      return null;
    }
    if (!(resource instanceof Array)) {
      resource = [resource];
    }
    jQuery.each(resource, function(index, value) {
      if (value['@type'] === 'dctypes:Text') {
        content = value.chars;
        return false;
      }
    });
    return content;
  },
  
  getTags: function(annotation) {
    var tags = [];

    if (jQuery.isArray(annotation.resource)) {
      jQuery.each(annotation.resource, function(index, value) {
        if (value['@type'] === "oa:Tag") {
          tags.push(value.chars);
        }
      });
    }
    return tags;
  },
  
  // For an annotation of annotation,
  // follow the "on" relation until the eventual target annotation if found.
  findFinalTargetAnnotation: function(annotation, annotations) {
    var nextId = '';
    var nextAnno = annotation;
    var targetAnno = null;
    
    if (nextAnno.on['@type'] !== 'oa:Annotation') {
      return annotation;
    }
    
    while(nextAnno) {
      //console.log('nextAnno: ');
      //console.dir(nextAnno);
      
      if (nextAnno.on['@type'] === 'oa:Annotation') {
        nextId = nextAnno.on.full;
        nextAnno = null;
        jQuery.each(annotations, function(index, anno) {
          if (anno['@id'] === nextId) {
            targetAnno = anno;
            nextAnno = anno;
            return false;
          }
        });
      } else {
        nextAnno = null;
      }
    }
    return targetAnno;
  },
  
  /**
   * Find annotations from "annotationsList" which this "annotation" annotates 
   * and which belong to the layer with "layerId".
   */
  findTargetAnnotations: function(annotationsList, layerId, annotation) {
    var targetId = annotation.on.full;
    return annotationsList.filter(function(currentAnno) {
      return currentAnno.layerId === layerId && currentAnno['@id'] === targetId;
    });
  },

  /**
   * Find annotations from "annotationsList" which annotates this "annotation"
   * and which belong to the layer with "layerId".
   */
  findTargetingAnnotations: function(annotationsList, layerId, annotation) {
    return annotationsList.filter(function(currentAnno) {
      var targetId = currentAnno.on.full;
      return currentAnno.layerId === layerId && annotation['@id'] === targetId;
    });
  }
};
