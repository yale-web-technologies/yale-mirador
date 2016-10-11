import svgUtil from './svg-util';

export default {
  
  /**
   * @returns {boolean} true if the annotation targets a canvas fragment, not another annotation.
   */
  isAnnoOnCanvas: function(annotation) {
    return annotation.on['@type'] !== 'oa:Annotation';
  },
  
  /**
   * Returns content of first text (non-tag) resource it finds from the annotation.
   */
  getAnnotationText: function(annotation) {
    var content = null;
    var resource = annotation.resource;
    
    if (!(resource instanceof Array || typeof resource === 'object')) {
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
  
  hasTags: function(annotation, tags) {
    const annoTags = this.getTags(annotation);
    
    for (let i = 0; i < tags.length; ++i) {
      let found = false;
      for (let j = 0; j < annoTags.length; ++j) {
        if (tags[i] === annoTags[j]) {
          found = true;
          break;
        }
      }
      if (!found) {
        return false;
      }
    }
    return true;
  },
  
  getTargetSelectorValue: function(annotation) {
    const selector =  annotation.on.selector;
    return selector ? selector.value : null;
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
  
  getFinalTargetCanvasIds(annotation) {
    const canvasIds = [];
    let targetAnno = null;
    
    if (annotation['@type'] === 'oa:Annotation') {
      targetAnno = this.findFinalTargetAnnotation(annotation, this.annotationsList);
    } else {
      targetAnno = annotation;
    }
    if (!targetAnno) {
      return [];
    }
    let targets = targetAnno.on;
    if (targets instanceof Array) {
      jQuery.each(targets, function(index, target) {
        if (target.full) {
          canvasIds.push(target.full);
        }
      });
    } else if (typeof targets === 'object') {
      if (targets.full) {
        canvasIds.push(targets.full);
      }
    } else {
      console.log('ERROR annoUtil.getFinalTargetCanvasIds: wrong target type ' + (typeof targets));
    }
    return canvasIds;
  },
  
  /**
   * Find annotations from "annotationsList" which this "annotation" annotates 
   * and which belong to the layer with "layerId".
   */
  findTargetAnnotations: function(annotation, annotationsList, layerId) {
    var targetId = annotation.on.full;
    return annotationsList.filter(function(currentAnno) {
      return currentAnno.layerId === layerId && currentAnno['@id'] === targetId;
    });
  },

  /**
   * Find annotations from "annotationsList" which annotates this "annotation"
   * and which belong to the layer with "layerId".
   */
  findTargetingAnnotations: function(annotation, annotationsList, layerId) {
    return annotationsList.filter(function(currentAnno) {
      var targetId = currentAnno.on.full;
      return currentAnno.layerId === layerId && annotation['@id'] === targetId;
    });
  },
  
  /**
   * Find annotations from "annotationsList" that belong to the same TOC node
   * and which belong to the layer with "layerId".
   */
  findTocSiblings: function(annotation, annotationsList, layerId, toc) {
    const node = toc.findNodeForAnnotation(annotation);
    if (!node) { return []; }
    return annotationsList.filter(function(currentAnno) {
      return currentAnno.layerId === layerId &&
        toc.findNodeForAnnotation(currentAnno) === node;
    });
  },

  /**
   * Merge annotation's target ("on" attribute) with a new "on" attribute (sourceTarget).
   */ 
  mergeTargets: function(annotation, sourceTarget) {
    if (annotation.on instanceof Array) {
      annotation.on.push(sourceTarget);
    } else {
      annotation.on = [annotation.on, sourceTarget];
    }
  },
  
  /**
   * XXX this version of mergeTargets will probably have to be removed
   * because SVG to SVG merge will likely turn out to be illegal against 
   * the IIIF spec. The selector SVG of a target should always contains 
   * a single path and if multiple targets exist for an annotation,
   * the "on" field should be an array of targets.
   *
   * Merge annotation's target ("on" attribute) with a new "on" attribute (sourceTarget).
   */ 
  mergeTargetsOld: function(annotation, sourceTarget) {
    const destTarget = annotation.on;
    let destCanvasId = destTarget.full;
    const sourceCanvasId = sourceTarget.full;

    if (destTarget instanceof Array) { // (destination) annotation has (possibly) multiple targets
      const targetsWithSameCanvasId = destTarget.filter(function(on) { 
        return on.full === sourceCanvasId;
      });
      if (targetsWithSameCanvasId.length === 1) { // there's a destination target on the same canvas as the source target
        const target = targetsWithSameCanvasId[0];
        target.selector.value = svgUtil.mergeSvgs(target.selector.value, sourceTarget.selector.value);
      } else if (targetsWithSameCanvasId.length === 0) { // there's no existing target on the same canvas
        annotation.on.push(sourceTarget);
      } else {
        throw 'multiple targets on same canvas';
      }
    } else { // (destination) annotation has a single target
      const destTargetId = destTarget.full;
      if (destCanvasId === sourceCanvasId) {
        destTarget.selector.value = svgUtil.mergeSvgs(destTarget.selector.value, sourceTarget.selector.value);
      } else {
        annotation.on = [ destTarget, sourceTarget];
      }
    }
  }
};
