import { getState, setState } from '../state.js';

// Menu bar at the top of the Mirador-embedding window.
export default class {
  constructor(options) {
    jQuery.extend(this, {
      headerElement: jQuery('#mirador_header')
    }, options);
    this.init();
  }
  
  init() {
    this.headerElement.find('.ui.dropdown').dropdown();
    this.initAnnoHeightMenu();
    this.bindEvents();
  }
  
  initAnnoHeightMenu() {
    this.annoHeightMenu = jQuery('#mr_menu_anno_height');
    if (getState('ANNO_CELL_FIXED') === 'true') {
      this.annoHeightMenu.find('.checkmark').show();
    } else {
      this.annoHeightMenu.find('.checkmark').hide();
    }
  }
  
  bindEvents() {
    var _this = this;
    
    jQuery('#mr_menu_add_window').click(function (event) {
      jQuery.publish('MR_ADD_WINDOW');
    });
    
    jQuery('#mr_menu_anno_height').click(function (event) {
      if (getState('ANNO_CELL_FIXED') === 'true') {
        setState('ANNO_CELL_FIXED', false);
        _this.annoHeightMenu.find('.checkmark').hide();
        jQuery.publish('MR_ANNO_HEIGHT_FIXED', false);
      } else {
        setState('ANNO_CELL_FIXED', true);
        _this.annoHeightMenu.find('.checkmark').show();
        jQuery.publish('MR_ANNO_HEIGHT_FIXED', true);
      }
    });
  }
}
