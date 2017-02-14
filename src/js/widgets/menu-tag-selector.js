import getLogger from '../util/logger';
import Selector from './selector';
import util from '../util/util';

const logger = getLogger();

export default class {
  constructor(options) {
    jQuery.extend(this, {
      selector: null,
      parent: null,
      annotationExplorer: null,
      changeCallback: null
    }, options);

    this.init();
  };

  init() {
    var _this = this;
    this.selector = new Selector({
      appendTo: this.parent,
      changeCallback: function(value, text) {
        logger.debug('MenuTagSelector select value:', value, 'text:', text);
        if (typeof _this.changeCallback === 'function') {
          _this.changeCallback(value, text);
        }
      }
    });
    return this.reload();
  }

  reload() {
    var _this = this;
    var toc = this.annotationExplorer.getAnnotationToc();
    var annoHierarchy = toc ? toc.annoHierarchy : null;

    return new Promise(function(resolve, reject) {
      if (!annoHierarchy) {
        reject();
      }
      _this.selector.empty();

      var layers = [];
      var menu = _this.buildMenu(annoHierarchy);
      logger.debug('MenuTagSelector menu:', menu);

      _this.selector.setItems(menu);

      setTimeout(function() {
        const value = (_this.initialTags && _this.initialTags.length > 0) ? _this.initialTags.join('|') : 'all';
        logger.debug('MenuTagSelector#reload initially setting value to', value);
        _this.selector.val(value, true);
        resolve();
      }, 0);
    });
  }

  val(value, skipNotify) {
    logger.debug('MenuTagSelector#val value:', value, 'skipNotify:', skipNotify);
    return this.selector.val(value, skipNotify);
  }

  /**
   * node: an annoHierarchy node
   */
  buildMenu(node, parentItem) {
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
        item.children.push(_this.buildMenu(childNode, node.isRoot ? null : item));
      });
    }
    if (node.isRoot) {
      return [{ label: 'All', value: 'all', children: [] }].concat(item.children);
    } else {
      return item;
    }
  }

  destroy() {
    this.selector.destroy();
  }
}
