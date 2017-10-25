import getLogger from '../../util/logger';

const logger = getLogger();

export default class DomHelper {
  constructor(appendTo) {
    this._root = jQuery(windowTemplate({}));
    appendTo.append(this._root);

    this._placeHolder = this._findOne(this._root, '.placeholder');
    this._layerSelectorContainer = this._findOne(this._root, '.layer-selector-container');
    this._tocTagSelector = this._findOne(this._root, '.toc-tag-selector-container');
    this._orderConfirm = this._findOne(this._root, '.order-confirm');
    this._saveOrderButton = this._findOne(this._orderConfirm, '.ym_button.save');
    this._cancelOrderButton = this._findOne(this._orderConfirm, '.ym_button.cancel');
    this._toggleDirectionButton = this._addToggleDirectionButton();
    this._createWindowButton = this._addCreateWindowButton();
    this._listContainer = this._findOne(this._root, '.list-container');

    this._orderConfirm.hide();
  }

  getRoot() {
    return this._root;
  }

  getPlaceHolder() {
    return this._placeHolder;
  }

  getLayerSelectorContainer() {
    return this._layerSelectorContainer;
  }

  getTocTagSelector() {
    return this._tocTagSelector;
  }

  getOrderConfirm() {
    return this._orderConfirm;
  }

  getSaveOrderButton() {
    return this._saveOrderButton;
  }

  getCancelOrderButton() {
    return this._cancelOrderButton;
  }

  getCreateWindowButton() {
    return this._createWindowButton;
  }

  getToggleDirectionButton() {
    return this._toggleDirectionButton;
  }

  getListContainer() {
    return this._listContainer;
  }

  getAllAnnotationCells() {
    return this.getListContainer().find('.annowin_anno').toArray();
  }

  _findOne(root, selector) {
    const found = root.find(selector);
    return found.length > 0 ? jQuery(found[0]) : null;
  }

  findAnnoListElem(rootElem) {
    return rootElem.find('.annowin_list');
  }

  /**
   * Return true if the element is an annotation cell, as opposed to a header
   */
  isAnnotationCell(elem) {
    return elem.hasClass('annowin_anno');
  }

  findAnnoElemByAnnoId(annoId) {
    for (let cell of this.getAllAnnotationCells()) {
      let $cell = jQuery(elem);
      if ($cell.data('annotationId') === annoId) {
        return $cell;
      }
    }
    return null;
  }

  updateDirection() {
    const rowReverse = this._root.hasClass('row-reverse');
    logger.debug('DomHelper#updateDirection rowReverse:', rowReverse);

    if (rowReverse) {
      this._root.find('.fa-arrows-h').hide();
      this._root.find('.fa-arrows-v').show();
      this._root.find('.order-down').attr('class', 'order-down caret left icon');
      this._root.find('.order-up').attr('class', 'order-up caret right icon');
    } else {
      this._root.find('.fa-arrows-h').show();
      this._root.find('.fa-arrows-v').hide();
      this._root.find('.order-down').attr('class', 'order-down caret down icon');
      this._root.find('.order-up').attr('class', 'order-up caret up icon');
    }
  }

  _addCreateWindowButton() {
    const parent = this._root.find('.annowin_layer_row .right');
    const button = jQuery('<div/>')
      .addClass('ym_create_window_button')
      .append(jQuery('<i class="fa fa-plus fa-lg fa-fw"></i>'));

    parent.append(button);
    return button;
  }

  _addToggleDirectionButton() {
    const parent = this._root.find('.annowin_layer_row .right');
    const button = jQuery('<div/>')
      .addClass('ym_toggle_direction_button')
      .append(jQuery('<i class="fa fa-arrows-h fa-lg fa-fw"></i>'))
      .append(jQuery('<i class="fa fa-arrows-v fa-lg fa-fw"></i>'));

    parent.append(button);
    button.find('.fa-arrows-v').hide();
    return button;
  }
}

const windowTemplate = Handlebars.compile([
  '<div class="ym_annotation_window">',
  '  <div class="annowin_header">',
  '    <div class="annowin_layer_row">',
  '      <span class="layer-selector-container"></span>',
  '      <div class="right"></div>',
  '    </div>',
  '    <div class="annowin_menu_tag_row">',
  '      <span class="toc-tag-selector-container"></span>',
  '    </div>',
  '  <div class="order-confirm">',
  '    <span class="ui small orange button ym_button save">Save new order</span>',
  '    <span class="ui small orange button ym_button cancel">Cancel</span>',
  '  </div>',
  '  </div>',
  '  <div class="placeholder"></div>',
  '  <div class="list-container" tabindex="-1">',
  '  </div>',
  '</div>'
].join(''));
