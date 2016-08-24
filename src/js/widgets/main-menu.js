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
    this.headerElement.html(template());
    this.headerElement.find('.ui.dropdown').dropdown();
    this.initAnnoHeightMenu();
    this.bindEvents();
  }
  
  initAnnoHeightMenu() {
    this.annoHeightMenu = jQuery('#ym_menu_anno_height');
    if (getState('ANNO_CELL_FIXED') === 'true') {
      this.annoHeightMenu.find('.checkmark').show();
    } else {
      this.annoHeightMenu.find('.checkmark').hide();
    }
  }
  
  bindEvents() {
    var _this = this;
    
    jQuery('#ym_menu_add_window').click(function (event) {
      jQuery.publish('YM_ADD_WINDOW');
    });
    
    jQuery('#ym_menu_anno_height').click(function (event) {
      if (getState('ANNO_CELL_FIXED') === 'true') {
        setState('ANNO_CELL_FIXED', false);
        _this.annoHeightMenu.find('.checkmark').hide();
        jQuery.publish('YM_ANNO_HEIGHT_FIXED', false);
      } else {
        setState('ANNO_CELL_FIXED', true);
        _this.annoHeightMenu.find('.checkmark').show();
        jQuery.publish('YM_ANNO_HEIGHT_FIXED', true);
      }
    });
  }
}

const template = Handlebars.compile([
  '<div class="ui small menu">',
  '  <div class="ui dropdown item">',
  '    Window <i style="margin-left: 5px" class="caret down icon"></i>',
  '    <div class="menu">',
  '      <div id="ym_menu_add_window" class="item">Add annotation window</div>',
  '    </div>',
  '  </div>',
  '  <div class="ui dropdown item">',
  '    View <i style="margin-left: 5px" class="caret down icon"></i>',
  '    <div class="menu">',
  '      <div id="ym_menu_anno_height" class="item">',
  '        Annotation cell - fixed height',
  '        <i class="checkmark icon"></i>',
  '      </div>',
  '    </div>',
  '  </div>',
  '  <a target="blank" class="item" href="https://github.com/yale-web-technologies/mirador-project/wiki/User-Guide---Mirador-@Yale">Help</a>',
  '</div>'
].join(''));
