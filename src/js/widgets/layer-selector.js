import Selector from './selector';

export default class {
  /**
   * init() should be called separately after instantiation
   * because it returns a jQuery deferred object.
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
    var _this = this;
    
    this.selector.empty();
    
    jQuery.each(layers, function(index, value) {
      _this.selector.addItem(value.label, value['@id']);
    });
    
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        if (layers.length > 0) {
          _this.selector.val(_this.initialLayerId || layers[0]['@id'], true);
          _this._isLoaded = true;
        }
        resolve();
      }, 0);
    });
  }
  
  val(value) {
    return this.selector.val(value);
  }
  
  isLoaded() {
    return this._isLoaded;
  }
  
  bindEvents() {
    var _this = this;
    this.selector.changeCallback = function(value, text) {
      if (typeof _this.changeCallback === 'function') {
        _this.changeCallback(value, text);
      }
    };
  }
}
