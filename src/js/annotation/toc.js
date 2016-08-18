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
     *   spec: AN_OBJECT, // spec object from this.spec, with label, short, tag attributes
     *   annotation: AN_OBJECT, // annotation
     *   layerIds: A_SET, // set of layer IDs for annotations that belong to this node or its children
     *   cumulativeLabel: A_STRING, // concatenation of short labels inherited from the parent nodes 
     *   cumulativeTags: [], // list of tags for this node and its ancestors
     *   childNodes: AN_OBJECT, // child TOC nodes as a hashmap on tags
     *   childAnnotations: AN_ARRAY, // non-TOC-node annotations that targets this node
     *   isRoot: A_BOOL, // true if the node is the root
     *   weight: A_NUMBER // for sorting
     * }
     */
    this.annoHierarchy = null;
    
    /**
     * Annotations that do not belong to the ToC structure.
     */
    this._unassigned = [];
    
    this.annoToNodeMap = {}; // key: annotation ID, value: node in annoHierarchy;
    this.init();
  }
  
  init(annotations) {
    console.log('Toc#init spec: ' + this.spec);
    console.dir(this.spec);
    
    this.annoHierarchy = this.newNode(null, null); // root node
    
    this.initTagWeights();
    this.parse(this.annotations);
  }
  
  /**
   * Find the node corresponding to the sequence of tags.
   * @param {...string} tags
   * @returns {object} a TOC node
   */
  getNode() {
    const tags = Array.from(arguments);
    let node = this.annoHierarchy;
    
    for (let tag of tags) {
      if (!node) { 
        break; 
      }
      node = node.childNodes[tag];
    }
    return (node === this.annoHierarchy) ? null : node;
  }
  
  findNodeForAnnotation(annotation) {
    const targetAnno = annoUtil.findFinalTargetAnnotation(annotation, this.annotations);
    return targetAnno ? this.annoToNodeMap[targetAnno['@id']] : null;
  }
  
  /**
   * Assign weights to tags according to their position in the array.
   */
  initTagWeights() {
    var _this = this;
    jQuery.each(this.spec.nodeSpecs, function(rowIndex, row) {
      jQuery.each(row, function(index, nodeSpec) {
        _this.tagWeights[nodeSpec.tag] = index;
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
          _this.registerLayerWithNode(node, annotation.layerId);
        } else {
          console.log('WARNING Toc#addRemainingAnnotations not covered by ToC');
          _this._unassigned.push(annotation);
        }
      } else {
        console.log('WARNING Toc#addRemainingAnnotations orphan');
        console.dir(annotation);
        _this._unassigned.push(annotation);
      }
    });
  }
  
  /**
   * Recursively builds the TOC structure.
   * @param {object} annotation Annotation to be assigned to the parent node
   * @param {string[]} tags 
   * @param {number} rowIndex Index of this.annoHierarchy
   * @param {object} parent Parent node
   * @return {boolean} true if the annotation was set to be a TOC node, false if not.
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
        this.registerLayerWithNode(parent, annotation.layerId);
        return true;
      }
    }
    
    var nodeSpec = this.tagInSpecs(tags, this.spec.nodeSpecs[rowIndex]);
    
    if (nodeSpec) { // one of the tags belongs to the corresponding level of the pre-defined tag hierarchy
      var tag = nodeSpec.tag;
      var annoHierarchy = this.annoHierarchy;
      
      if (!parent.childNodes[tag]) {
        parent.childNodes[tag] = this.newNode(nodeSpec, parent);
      }
      currentNode = parent.childNodes[tag];
      if (parent.isRoot) {
        currentNode.cumulativeLabel = currentNode.spec.short;
      } else {
        currentNode.cumulativeLabel = parent.cumulativeLabel +
          this.spec.shortLabelSeparator + currentNode.spec.short;
      }
      return this.buildChildNodes(annotation, tags, rowIndex+1, currentNode);
    } else { // no matching tags so far
      if (parent.isRoot) {
        return false;
      } else {
        parent.annotation = annotation;
        this.registerLayerWithNode(parent, annotation.layerId);
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

  newNode(nodeSpec, parent) {
    if (!parent) { // root node
      return {
        isRoot: true,
        childNodes: {}
      };
    } else {
      const tags = parent.isRoot ? [nodeSpec.tag] :
        parent.cumulativeTags.concat([nodeSpec.tag]);
      return {
        spec: nodeSpec,
        annotation: null,
        layerIds: new Set(),
        cumulativeLabel: '',
        cumulativeTags: tags,
        childNodes: {},
        childAnnotations: [],
        weight: this.tagWeights[nodeSpec.tag]
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
    
    //console.log('Node: ');
    //console.dir(node);
    
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
  
  registerLayerWithNode(node, layerId) {
    node.layerIds.add(layerId);
  }
  
  unassigned() {
    return this._unassigned;
  }
  
  numUnassigned() {
    return this._unassigned.length;
  }
  
  /**
   * Traverses the Toc structure and calls visitCallback() for each node.
   * @param {function} visitCallback
   */
  walk(visitCallback) {
    this.visit(this.annoHierarchy, visitCallback);
  }
  
  visit(node, callback) {
    const _this = this;
    const sortedTags = Object.keys(node.childNodes).sort(function(a, b) {
      return _this.tagWeights[a] - _this.tagWeights[b];
    });
    
    jQuery.each(sortedTags, function(index, tag) {
      let childNode = node.childNodes[tag];
      callback(childNode);
      _this.visit(childNode, callback);
    });
  }
  
}
