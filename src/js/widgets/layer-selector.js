import Selector from './selector';
import getUserSettings from '../config/user-settings';

export default class {
  /**
   * init() should be called separately after instantiation
   * because it returns a Promise.
   */
  constructor(options) {
    jQuery.extend(this, {
      selector: null,
      parent: null,
      changeCallback: null,
      initialLayerId: null
    }, options);
  }

  /**
   * @returns {Promise}
   */
  init(layers) {
    console.log('LayerSelector#init layers:', layers);
    this._isLoaded = false;
    this.selector = new Selector({
      appendTo: this.parent
    });
    this.bindEvents();
    return this.reload(layers);
  }
  
  /**
   * @returns {Promise}
   */
  reload(layers) {
    console.log('LayerSelector#reload');
    const _this = this;
    
    this.selector.empty();
    
    for (let layer of layers) {
      _this.selector.addItem(layer.label, layer['@id']);
    }
    return new Promise(function(resolve, reject) {
      if (layers.length > 0) {
        _this.selector.val(_this.initialLayerId || layers[0]['@id'], true);
        _this._isLoaded = true;
      }
      resolve();
    });
  }
  
  val(value, skipNotify) {
    const retVal = this.selector.val(value, skipNotify);
    if (value !== undefined) {
      console.log('val:', value);
      getUserSettings().set('lastSelectedLayer', value);
    }
    return retVal;
  }
  
  isLoaded() {
    return this._isLoaded;
  }
  
  bindEvents() {
    var _this = this;
    this.selector.changeCallback = function(value, text) {
      getUserSettings().set('lastSelectedLayer', value);
      if (typeof _this.changeCallback === 'function') {
        _this.changeCallback(value, text);
      }
    };
  }
}
