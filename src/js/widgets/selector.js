export default class {
  /**
   * A selector dropdown implemented with Semantic UI.
   */
  constructor(options) {
    jQuery.extend(this, {
      appendTo: null,
      changeCallback: null
    }, options);

    this.init();
  }
  
  init() {
    var _this = this;
    this.element = jQuery(template());
    this.appendTo.append(this.element);
    this.element.dropdown({
      direction: 'downward',
      onChange: function(value, text) {
        console.log('Selector#init onChange ', value, text);
        if (typeof _this.changeCallback === 'function' && !_this._skipNotify) {
          _this.changeCallback(value, text);
        }
        this._skipNotify = false;
      },
      action: function(text, value) {
        _this.element.dropdown('set selected', value);
        _this.element.dropdown('hide');
      }
    });
    this.values = [];
  }
  
  setItems(itemsConfig) {
    var root = this.element.find('.menu');
    root.empty();
    this._setItems(itemsConfig, root);
  }
  
  _setItems(itemsConfig, parent) {
    var _this = this;
    jQuery.each(itemsConfig, function(index, value) {
      if (value.children.length > 0) {
        _this.addItem(value.label, value.value, parent);
        var menu = _this.addMenuItem(value.label, value.value, parent);
        _this._setItems(value.children, menu);
      } else {
        _this.addItem({
          label: value.label,
          value: value.value,
          parent: parent
        });
      }
    });
  }
  
  addMenuItem(label, value, parent) {
    var item = jQuery('<div/>')
      .addClass('item')
      .attr('data-text', label)
      .attr('data-value', value)
      .text(label);
    var menu = jQuery('<div/>')
      .addClass('menu')
      .css('overflow', 'hidden');
    item.append(jQuery('<i class="dropdown icon"></i>'));
    item.append(menu);
    parent.append(item);
    this.values.push(value);
    return menu;
  }
  
  addItem(options) {
    const item = jQuery(itemTemplate({
      label: options.label,
      colorClass: options.colorClass
    }))
    .attr('data-text', options.label)
    .attr('data-value', options.value);

    parent = options.parent || this.element.find('.menu');
    parent.append(item);
  }
  
  empty() {
    this.element.find('.menu').empty();
  }
  
  val(value, skipNotify) {
    const dd = this.element;
    this._skipNotify = skipNotify || false;
    dd.dropdown('refresh');
    
    if (value === undefined) {
      return dd.dropdown('get value');
    } else {
      if (dd.dropdown('get item', value)) {
        dd.dropdown('set selected', value);
        return value;
      } else {
        dd.dropdown('set selected', this.values[0]);
        return this.values[0];
      }
    }
  }
  
  setColorClass(newClass) {
    if (this._oldClass) {
      this.element.removeClass(this._oldClass);
    }
    this.element.addClass(newClass);
    this._oldClass = newClass;
  }

  destroy() {
    this.element.remove();
  }
}

const template = Handlebars.compile([
  '<div class="basic tiny ui button ym_button dropdown">',
  '  <input name="selection" type="hidden" />',
  '  <div class="default text"></div>',
  '  <i class="ym dropdown icon"></i>',
  '  <div class="menu">',
  '  </div>',
  '</div>'
].join(''));

const itemTemplate = Handlebars.compile([
  '<div class="item">',
  '  {{#if colorClass}}',
  '    <span class="icon_span"><i class="circle icon {{colorClass}}"></i></span>',
  '  {{/if}}',
  '  <span class="label">{{label}}</span>',
  '</div>'
].join(''));
