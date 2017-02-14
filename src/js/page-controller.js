import getLogger from './util/logger';
import MiradorWrapper from './mirador-wrapper';
import session from './session';

export default function getPageController() {
  if (!instance) {
    instance = new PageController();
  }
  return instance;
};

let instance = null;
let logger = getLogger();

/**
 * Code for the HTML page that hosts Mirador instance(s)
 */
class PageController {
  init(options) {
    this.options = jQuery.extend({
      mainMenu: null,
      grid: null,
      settings: null // settings retrieved from remote API
    }, options);
    logger.debug('PageController#constructor options:', options);

    const miradorOptions = jQuery.extend(this.options.settings, {
      miradorId: Mirador.genUUID(),
      defaultSettings: Mirador.DEFAULT_SETTINGS,
      isEditor: session.isEditor()
    });

    this._createMirador(miradorOptions);
    this._bindEvents(miradorOptions);
  }

  // TODO: make it per Mirador instance
  getConfig() {
    return this.miradorWrapper.getConfig();
  }

  _createMirador(miradorOptions) {
    try {
      // Should create a container in the grid first before instantiating Mirador
      this.options.grid.addMiradorWindow(miradorOptions.miradorId);
      this.miradorWrapper = new MiradorWrapper(miradorOptions);
    } catch(e) {
      const msg = 'PageController#_createMirador ' + e;
      logger.error(msg);
      throw msg;
    }
  }

  _bindEvents(options) {
    logger.debug('PageController#_bindEvents options:', options);
    const _this = this;

    jQuery(window).resize(function() {
      _this.options.grid.resize();
    });
  }
}
