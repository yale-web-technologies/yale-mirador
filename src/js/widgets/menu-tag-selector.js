import getLogger from '../util/logger';
import Selector from './selector';
import util from '../util/util';

const logger = getLogger();

export default class MenuTagSelector {
  constructor(options) {
    logger.debug('MenuTagSelector#constructor options:', options);
    this.options = Object.assign({
      selector: null,
      parent: null,
      tocSpec: null,
      annotationExplorer: null,
      changeCallback: null,
      initialTags: null,
      depth: 1
    }, options);

    this.init();
  };

  init() {
    var _this = this;
    if (this.options.initialTags) {
      this.options.initialTags = this.options.initialTags.slice(0, this.options.depth);
    }

    this.options.selector = new Selector({
      appendTo: this.options.parent,
      changeCallback: function(value, text) {
        logger.debug('MenuTagSelector select value:', value, 'text:', text);
        if (typeof _this.options.changeCallback === 'function') {
          _this.options.changeCallback(value, text);
        }
      }
    });
    return this.reload();
  }

  reload() {
    //var toc = this.options.annotationExplorer.getAnnotationToc();
    //var annoHierarchy = toc ? toc.annoHierarchy : null;
    const tocSpec = this.options.tocSpec;

    return new Promise((resolve, reject) => {
      /*
      if (!annoHierarchy) {
        reject('Undefined annoHierarchy');
        return;
      }
      */

      this.options.selector.empty();

      var layers = [];
      //var menu = this.buildMenu(annoHierarchy, null, 0); //XXX
      var menu = this.buildMenu(tocSpec, null, 0); //XXX
      logger.debug('MenuTagSelector menu:', menu);

      this.options.selector.setItems(menu);

      const topGen = tocSpec.generator[0];
      const firstValue = topGen.tag.prefix + '1';

      setTimeout(() => {
        const value = (this.options.initialTags && this.options.initialTags.length > 0) ?
          this.options.initialTags.join('|') : firstValue;
        logger.debug('MenuTagSelector#reload initially setting value to', value);
        this.options.selector.val(value, true);
        resolve();
      }, 0);
    });
  }

  val(value, skipNotify) {
    logger.debug('MenuTagSelector#val value:', value, 'skipNotify:', skipNotify);
    return this.options.selector.val(value, skipNotify);
  }

  buildMenu(tocSpec) {
    const topGen = tocSpec.generator[0];
    const menu = [];
    for (let i = 1; i <= topGen.max; ++i) {
      menu.push({
        label: topGen.label.prefix + i,
        value: topGen.tag.prefix + i,
        children: []
      });
    }
    return menu;
  }

  /**
   * node: an annoHierarchy node
   */
  buildMenu_old(node, parentItem, currentDepth) {
    logger.debug('MenuTagSelector#buildMenu node:', node, 'parentItem:', parentItem, 'currentDepth:', currentDepth);
    if (currentDepth > this.options.depth) {
      return null;
    }
    const _this = this;
    const children = util.getValues(node.childNodes)
      .sort(function(a, b) {
        return a.weight - b.weight;
      });

    let item = { children: [] };

    if (!node.isRoot) {
      var label = parentItem ? parentItem.label + ', ' + node.spec.label : node.spec.label;
      var value = parentItem ? parentItem.value + '|' + node.spec.tag : node.spec.tag;
      item.label = label;
      item.value = value;
    }
    if (children.length > 0) {
      jQuery.each(children, function(key, childNode) {
        const subMenu = _this.buildMenu(childNode, node.isRoot ? null : item, currentDepth + 1);
        if (subMenu) {
          item.children.push(subMenu);
        }
      });
    }
    if (node.isRoot) {
      return [{ label: 'All', value: 'all', children: [] }].concat(item.children);
    } else {
      return item;
    }
  }

  destroy() {
    this.options.selector.destroy();
  }
}
