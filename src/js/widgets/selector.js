import getLogger from '../util/logger';

const logger = getLogger();

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
    const _this = this;
    this.element = jQuery(template());
    this.appendTo.append(this.element);
    this.element.dropdown({
      direction: 'downward',
      onChange: (value, text) => {
        logger.debug('Selector#init onChange ', value, text, _this._skipNotify);
        if (typeof _this.changeCallback === 'function' && !_this._skipNotify) {
          _this.changeCallback(value, text);
        }
        _this._skipNotify = false;
      },
      action: (text, value) => {
        _this.element.dropdown('set selected', value);
        _this.element.dropdown('hide');
      }
    });
    this.values = [];
  }

  setItems(itemsConfig) {
    logger.debug('Selector#setItems itemsConfig:', itemsConfig);
    const root = this.element.find('.menu');
    root.empty();
    this._setItems(itemsConfig, root);
  }

  _setItems(itemsConfig, parent) {
    const _this = this;
    jQuery.each(itemsConfig, (index, value) => {
      if (value.children.length > 0) {
        _this.addItem({
          label: value.label,
          value: value.value,
          parent: parent
        });
        const menu = _this.addMenuItem(value.label, value.value, parent);
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
    const item = jQuery('<div/>')
      .addClass('item')
      .attr('data-text', label)
      .attr('data-value', value)
      .text(label);
    const menu = jQuery('<div/>')
      .addClass('menu')
      .css('overflow', 'hidden');
    item.append(jQuery('<i class="dropdown icon"></i>'));
    item.append(menu);
    parent.append(item);
    return menu;
  }

  addItem(options) {
    logger.debug('Selector#addItem options:', options);

    const item = jQuery(itemTemplate({
      label: options.label,
      colorClass: options.colorClass
    }))
    .attr('data-text', options.label)
    .attr('data-value', options.value);

    parent = options.parent || this.element.find('.menu');
    parent.append(item);
    this.values.push(options.value);
  }

  empty() {
    this.element.find('.menu').empty();
  }

  val(value, skipNotify) {
    logger.debug('Selector#val', value, skipNotify);
    const dd = this.element;
    this._skipNotify = skipNotify || false;
    dd.dropdown('refresh');

    if (value === undefined) { // get value
      return dd.dropdown('get value');
    } else { // set value
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
