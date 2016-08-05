import Selector from './selector';
import util from '../util/util';

export default class {
  constructor(options) {
    jQuery.extend(this, {
      selector: null,
      parent: null,
      endpoint: null,
      changeCallback: null
    }, options);
    
    this.init();
  };
  
  init() {
    var _this = this;
    this.selector = new Selector({
      appendTo: this.parent,
      changeCallback: function(value, text) {
        console.log('SELECT value: ' + value + ', text: ' + text);
        if (typeof _this.changeCallback === 'function') {
          _this.changeCallback(value, text);
        }
      }
    });
    return this.reload();
  }
  
  reload() {
    var _this = this;
    var dfd = jQuery.Deferred();
    var toc = this.endpoint.getCanvasToc();
    var annoHierarchy = toc ? toc.annoHierarchy : null;
    
    if (!annoHierarchy) {
      dfd.reject();
      return dfd;
    }
    
    this.selector.empty();
    
    var layers = [];
    
    var menu = this.buildMenu(annoHierarchy);
    console.log('MenuTagSelector menu: ' + JSON.stringify(menu, null, 2));
    
    this.selector.setItems(menu);
    
    setTimeout(function() {
      _this.selector.val('all');
      dfd.resolve();
    }, 0);
    return dfd;
  }
  
  val(value) {
    return this.selector.val(value);
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
    
    console.log('node:');
    console.dir(node);
      
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
