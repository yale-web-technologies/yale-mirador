import {Anno, annoUtil} from 'import';

let logger = { debug: () => null, info: () => null, warning: () => null, error: () => null };

/**
 * A tag based table-of-contents structure for annotations.
 *
 * Builds a structure (annoHiercrchy) of annotations
 * so they can be accessed and manipulated
 * according to the pre-defined TOC tags hierarchy (spec).
 */
export default class AnnotationToc {
  constructor(spec, annotations, options) {
    this.options = Object.assign({
      logger: null
    }, options || {});

    if (this.options.logger) {
      logger = this.options.logger;
    }

    this.spec = spec;
    this.annotations = annotations;
    this._annoMap = {};
    for (let anno of annotations) {
      this._annoMap[anno['@id']] = anno;
    }

    /**
     * This can be considered the output of parse,
     * while "this.spec" and "annotations" are the input.
     *
     * Each node is an object:
     * {
     *   annotations: [], // annotations that directly belong to this node
     *   canvasAnnotations: [], // annotations that targets a canvas directly
     *   tags: [], // tags for this node
     *   childNodes: AN_OBJECT, // child TOC nodes as a hashmap on tags
     *   isRoot: A_BOOL, // true if the node is the root
     *   isDummy: A_BOOL  // true if the node is just a placeholder for reaching the next level of depth
     * }
     */
    this._root = null;

    /**
     * Annotations that do not belong to the ToC structure.
     */
    this._unassigned = [];

    this.annoToNodeMap = {}; // key: annotation ID, value: node in annoHierarchy;
    this.init();
  }

  init(annotations) {
    logger.debug('AnnotationToc#init spec: ', this.spec);
    this._root = this._newNode(null, null); // root node
    this.parse(this.annotations);
  }

  /**
   * Find the node corresponding to the sequence of tags.
   * @param {...string} tags
   * @returns {object} a TOC node
   */
  getNode() {
    const tags = Array.from(arguments);
    let node = this._root;

    for (let tag of tags) {
      if (!node) {
        break;
      }
      node = node.childNodes[tag];
    }
    return (node === this._root) ? null : node;
  }

  findNodeForAnnotation(annotation) {
    return this.getNode.apply(this, annotation.tocTags);
  }

  getNodeFromTags(tags) {
    return this.getNode.apply(this, tags);
  }

  /**
   * Return an array of tags for the node to which the annotation belongs
   * @param {string} annotationId
   */
  getTagsFromAnnotationId(annotationId) {
    let tags = [];

    this.walk(node => {
      for (let anno of node.annotations) {
        if (anno['@id'] === annotationId) {
          tags = node.tags;
          return true;
        }
      }
    });
    return tags;
  }

  /**
   * @param {object} annotation
   * @param {string[]} tags
   */
  matchHierarchy(annotation, tags) {
    const node = this.getNodeFromTags(tags);
    return node ? this.matchNode(annotation, node) : false;
  }

  matchNode(annotation, node) {
    let matched = false;

    let annos = node.canvasAnnotations.filter(anno => anno['@id'] === annotation['@id']);
    if (annos.length > 0) {
      return true;
    }

    annos = node.annotations.filter(anno => anno['@id'] === annotation['@id']);
    if (annos.length > 0) {
      return true;
    }

    for (let childNode of Object.values(node.childNodes)) {
      if (this.matchNode(annotation, childNode)) {
        return true;
      }
    }
    return false;
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
    this._visit(this._root, visitCallback, 0);
  }

  _visit(node, callback, level) {
    const sortedNodes = Object.values(node.childNodes)
      .sort((n0, n1) => n0.weight - n1.weight);

    for (let childNode of sortedNodes) {
      let stop = callback(childNode, level);
      if (!stop) {
        this._visit(childNode, callback, level + 1);
      }
    }
  }

  parse() {
    this._buildTocTree(this.annotations);
    this._setNodeOrders(this._root);
  }

  // Assign weights to child nodes, recursively
  _setNodeOrders(node) {
    if (node.childNodes.length === 0) {
      return;
    }

    const pattern = /\d+$/;
    const sortedKeys = Object.keys(node.childNodes).sort((tag0, tag1) => {
      const num0 = Number(tag0.substring(tag0.match(pattern).index));
      const num1 = Number(tag1.substring(tag1.match(pattern).index));
      return num0 - num1;
    });

    for (let i = 0; i < sortedKeys.length; ++i) {
      let key = sortedKeys[i];
      let childNode = node.childNodes[key];

      childNode.weight = i;
      this._setNodeOrders(childNode);
    }
  }

  /**
   * Build a TOC structure
   * @return An array of annotations that are NOT assigned to a TOC node.
   */
  _buildTocTree(annotations) {
    const remainder = [];

    for (let annotation of annotations) {
      const $anno = Anno(annotation);
      const tags = $anno.tags;
      const success = this._buildChildNodes(annotation, tags, 0, this._root);

      if (!success) {
        this._unassigned.push(annotation);
      }
    }
  }

  /**
   * Recursively builds the TOC structure.
   * @param {object} annotation Annotation to be assigned to the parent node
   * @param {string[]} tags
   * @param {number} rowIndex Index of this._root
   * @param {object} parent Parent node
   * @return {boolean} true if the annotation was set to be a TOC node, false if not.
   */
  _buildChildNodes(annotation, tags, rowIndex, parent) {
    //logger.debug('AnnotationToc#_buildChildNodes anno:', annotation, 'tags:', tags, 'depth:', rowIndex, 'parent:', parent);
    let currentNode = null;

    if (rowIndex >= this.spec.generator.length) { // all tags matched with no more levels to explore in the TOC structure
      if (parent.isRoot) { // Note: the root is not a TOC node
        return false; // generator has no depth
      } else { // Assign the annotation to parent (a TOC node)
        annotation.tocTags = parent.tags;
        if (annoUtil.hasTargetOnCanvas(annotation)) {
          parent.canvasAnnotations.push(annotation);
        }
        parent.annotations.push(annotation);
        this.annoToNodeMap[annotation['@id']] = parent;
        return true;
      }
    }

    const [tag, isDummy] = this._getTagForLevel(tags, rowIndex);

    if (tag) { // one of the tags belongs to the corresponding level of tag hierarchy
      if (!parent.childNodes[tag]) {
        parent.childNodes[tag] = this._newNode(tag, parent, isDummy);
      }
      currentNode = parent.childNodes[tag];

      if (parent.isRoot) {
        currentNode.label = this._extractTagNumber(tag);
      } else {
        currentNode.label = parent.label + '.' + this._extractTagNumber(tag);
      }
      return this._buildChildNodes(annotation, tags, rowIndex+1, currentNode);
    } else { // no more match before reaching a leaf node
      if (parent.isRoot) {
        return false;
      } else {
        annotation.tocTags = parent.tags;
        if (annoUtil.hasTargetOnCanvas(annotation)) {
          parent.canvasAnnotations.push(annotation);
        }
        parent.annotations.push(annotation);
        this.annoToNodeMap[annotation['@id']] = parent;
        return true;
      }
    }
  }

  _getTagForLevel(tags, level) {
    //logger.debug('AnnotationToc#_getTagForLevel tags:', tags, 'level:', level);
    const prefix = this.spec.generator[level].tag.prefix;

    for (let tag of tags) {
      let match = tag.match('^' + prefix + '(\\d+)$');
      if (match) {
        let isDummy = match[1] === '0';
        return [tag, isDummy];
      }
    }
    return [null, null];
  }

  _extractTagNumber(tag) {
    return tag.match(/\d+$/)[0];
  }

  /**
   *
   * @param {string} tag
   * @param {object} parent parent node
   * @param {boolean} isDummy true if a placeholder node
   */
  _newNode(tag, parent, isDummy) {
    if (!parent) { // root node
      return {
        isRoot: true,
        childNodes: {}
      };
    } else {
      const tags = parent.isRoot ? [tag] :
        parent.tags.concat([tag]);

      return {
        annotations: [],
        canvasAnnotations: [],
        tags: tags,
        label: '',
        childNodes: {},
        weight: 0, // to define order among nodes at the same level
        isDummy: isDummy
      };
    }
  }

  // For debugging
  print() {
    const pad = (level) => {
      let s = '';
      for (let i = 0; i < level; ++i) {
        s += '  ';
      }
      return s;
    };

    const trim = (s, maxLen, trimFromRight)  => {
      if (s.length > maxLen) {
        if (trimFromRight) {
          s = '... ' + s.substring(s.length - maxLen + 4);
        } else {
          s = s.substring(0, maxLen - 4) + ' ...';
        }
      }
      return s;
    };

    let t = '';

    this.walk((node, level) => {
      t += pad(level) + '- [n] ';
      t += String(node.tags);
      t += '\n';
      for (let anno of node.annotations) {
        t += pad(level + 1) + '- [a] ';
        let bodyText = Anno(anno).bodyText || '';
        t += trim(bodyText, 60) + '\n';
        let layerId = anno.layerId || '';
        t += pad(level + 1) + '      ' + trim(layerId, 60, true) + '\n';
      }
    });

    console.log('TOC:\n' + t);
  }
}
