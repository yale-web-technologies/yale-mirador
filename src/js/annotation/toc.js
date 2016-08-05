import annoUtil from './anno-util';

/**
 * A tag based table-of-contents structure for annotations.
 *
 * Builds a structure (annoHiercrchy) of annotations
 * so they can be accessed and manipulated
 * according to the pre-defined TOC tags hierarchy (spec).
 */
export default class Toc {
  constructor(spec, annotations) {
    /*
     * Spec is a JSON passed from outside (an array of arrays).
     * It defines the tags to be used to define the hiearchy.
     * It is different from "ranges" because 
     * it is used to define a strucutre of annotations in a single canvas 
     * while ranges are used to define a structure of canvases in a sequence.
     * For example, the first array could list tags for sections of a story
     * and the second one could list tags for sub-sections.
     */
    this.spec = spec;
    
    this.annotations = annotations;
    this.tagWeights = {}; // for sorting
    
    /**
     * This can be considered the output of parse,
     * while "this.spec" and "annotations" are the input.
     * 
     * Each node is an object:
     * {
     *   label: A_STRING, // label for display
     *   tag: A_STRING, // value of the tag
     *   weight: A_NUMBER, // for sorting
     *   annotation: AN_OBJECT, // annotation
     *   childNodes: AN_OBJECT, // child TOC nodes as a hashmap on tags
     *   childAnnotations: AN_ARRAY, // non-TOC-node annotations that targets this node
     *   isRoot: A_BOOL, // true if the node is the root
     * }
     */
    this.annoHierarchy = null;
    
    this.annoToNodeMap = {}; // key: annotation ID, value: node in annoHierarchy;
    this.init();
  }
  
  init(annotations) {
    console.log('Toc#init spec: ' + this.spec);
    console.dir(this.spec);
    
    this.annoHierarchy = this.newNode(null, true); // root node
    
    this.initTagWeights();
    this.parse(this.annotations);
  }
  
  /**
   * Find the node corresponding to the sequence of tags.
   * @param {...string} tags
   * @returns {object} a TOC node
   */
  getNode() {
    var args = Array.from(arguments);
    var node = this.annoHierarchy;
    for (var i = 0; i < args.length; ++i) {
      var tag = args[i];
      var node = node.childNodes[tag];
    }
    return node;
  }
  
  /**
   * Assign weights to tags according to their position in the array.
   */
  initTagWeights() {
    var _this = this;
    jQuery.each(this.spec.nodeSpecs, function(rowIndex, row) {
      jQuery.each(row, function(tagIndex, tagObj) {
        _this.tagWeights[tagObj.tag] = tagIndex;
      });
    });
  }
  
  parse() {
    // First pass
    var remainingAnnotations = this.addTaggedAnnotations(this.annotations);
    // Second pass
    this.addRemainingAnnotations(remainingAnnotations);
  }
  
  /**
   * Build a TOC structure
   * @return An array of annotations that are NOT assigned to a TOC node.
   */
  addTaggedAnnotations(annotations) {
    var _this = this;
    var remainder = [];
    
    jQuery.each(annotations, function(index, annotation) {
      var tags = annoUtil.getTags(annotation);
      var success = _this.buildChildNodes(annotation, tags, 0, _this.annoHierarchy);
      if (!success) {
        remainder.push(annotation);
      }
    });
    return remainder;
  }
  
  addRemainingAnnotations(annotations) {
    var _this = this;
    jQuery.each(annotations, function(index, annotation) {
      var targetAnno = annoUtil.findFinalTargetAnnotation(annotation, _this.annotations);
      if (targetAnno) {
        var node = _this.annoToNodeMap[targetAnno['@id']];
        if (targetAnno && node) {
          node.childAnnotations.push(annotation);
        }
      } else {
        console.log('WARNING ParsedAnnotations#addRemainingAnnotations not added anywhere: ');
        console.dir(annotation);
      }
    });
  }
  
  /**
   * Recursively builds the TOC structure.
   * @param {rowIndex} index of this.annoHierarchy
   * @return true if the annotation was set to be a TOC node, false if not.
   */
  buildChildNodes(annotation, tags, rowIndex, parent) {
    //console.log('ParsedAnnotations#buildNode rowIndex: ' + rowIndex + ', anno:');
    //console.dir(annotation);
    
    var currentNode = null;

    if (rowIndex >= this.spec.nodeSpecs.length) { // no more levels to explore in the TOC structure
      if (parent.isRoot) { // The root is not a TOC node
        return false;
      } else { // Assign the annotation to parent (a TOC node)
        parent.annotation = annotation;
        this.annoToNodeMap[annotation['@id']] = parent;
        return true;
      }
    }
    
    var tagObj = this.tagInSpecs(tags, this.spec.nodeSpecs[rowIndex]);
    
    if (tagObj) { // one of the tags belongs to the corresponding level of the pre-defined tag hierarchy
      var tag = tagObj.tag;
      var annoHierarchy = this.annoHierarchy;
      
      if (!parent.childNodes[tag]) {
        parent.childNodes[tag] = this.newNode(tagObj);
      }
      currentNode = parent.childNodes[tag];
      return this.buildChildNodes(annotation, tags, rowIndex+1, currentNode);
    } else {
      if (parent.isRoot) { // no matching tags so far
        return false;
      } else {
        parent.annotation = annotation;
        this.annoToNodeMap[annotation['@id']] = parent;
        return true;
      }
    }
  }
  
  /**
   * A tag object is an object in this.tagHierarcy that represents a tag.
   *
   * @param {string[]} tags List of tags
   * @param {object[]} nodeSpecs List of node specs
   * @return {object} The "node spec" object if one of the objects in nodeSpecs represents one of the tags; null if not.
   */
  tagInSpecs(tags, nodeSpecs) {
    var match = null;
    jQuery.each(tags, function(index, tag) {
      jQuery.each(nodeSpecs, function(listIndex, nodeSpec) {
        if (tag === nodeSpec.tag) {
          match = nodeSpec;
          return false;
        }
      });
      if (match) {
        return false;
      }
    });
    return match;
  }
  
  newNode(tagObj, isRoot) {
    if (isRoot) {
      return {
        isRoot: true,
        childNodes: {}
      };
    } else {
      return {
        spec: tagObj,
        weight: this.tagWeights[tagObj.tag],
        annotation: null,
        childNodes: {},
        childAnnotations: []
      };
    }
  }
  
  getNodeFromTags(tags) {
    var node = this.annoHierarchy;
    
    jQuery.each(tags, function(index, tag) {
      node = node.childNodes[tag];
      if (!node) {
        return false;
      }
    });
    return node;
  }
  
  matchHierarchy(annotation, tags) {
    var node = this.getNodeFromTags(tags);
    return node ? this.matchNode(annotation, node) : false;
  }
  
  matchNode(annotation, node) {
    var _this = this;
    var matched = false;
    
    console.log('Node: ');
    console.dir(node);
    
    if (node.annotation['@id'] === annotation['@id']) {
      return true;
    }
    jQuery.each(node.childAnnotations, function(index, value) {
      if (value['@id'] === annotation['@id']) {
        matched = true;
        return false;
      }
    });
    jQuery.each(node.childNodes, function(index, childNode) {
      if (_this.matchNode(annotation, childNode)) {
        matched = true;
        return false;
      }
    });
    return matched;
  }
  
  sortedAnnosWithHeaders(annotations) {
    console.log('XXXXXXXXX');
    console.log('XXXXXXXXX sortedAnnosWithHeaders');
    console.log('XXXXXXXXX');
    return annotations;
  }
}
