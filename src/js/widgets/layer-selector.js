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
      endpoint: null,
      changeCallback: null
    }, options);
  }
  
  init() {
    this._isLoaded = false;
    this.selector = new Selector({
      appendTo: this.parent
    });
    this.bindEvents();
    return this.reload(); // return a Deferred object.
  }
  
  reload() {
    console.log('LayerSelector#reload');
    var _this = this;
    var dfd = jQuery.Deferred();
    var layers = this.endpoint.annotationLayers;
    
    this.selector.empty();
    
    jQuery.each(layers, function(index, value) {
      _this.selector.addItem(value.label, value['@id']);
    });
    
    setTimeout(function() {
      if (layers.length > 0) {
        _this.selector.val(layers[0]['@id'], true);
        _this._isLoaded = true;
      }
      dfd.resolve();
    }, 0);
    return dfd;
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
