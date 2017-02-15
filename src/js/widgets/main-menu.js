import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import getStateStore from '../state-store';

// Menu bar at the top of the Mirador-embedding window.
// TODO - remove. The menu should be hidden or minimized somewhere.
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
    const state = getStateStore();

    this.annoHeightMenu = jQuery('#ym_menu_anno_height');
    if (state.getString('ANNO_CELL_FIXED') === 'true') {
      this.annoHeightMenu.find('.checkmark').show();
    } else {
      this.annoHeightMenu.find('.checkmark').hide();
    }
  }

  bindEvents() {
    const _this = this;
    const state = getStateStore();

    jQuery('#ym_menu_add_window').click(function (event) {
      jQuery.publish('YM_ADD_WINDOW', { miradorId: getMiradorProxyManager().anyId() });
    });

    jQuery('#ym_menu_anno_height').click(function (event) {
      if (state.getString('ANNO_CELL_FIXED') === 'true') {
        state.setString('ANNO_CELL_FIXED', false);
        _this.annoHeightMenu.find('.checkmark').hide();
        jQuery.publish('YM_ANNO_HEIGHT_FIXED', false);
      } else {
        state.setString('ANNO_CELL_FIXED', true);
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
