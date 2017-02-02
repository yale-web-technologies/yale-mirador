import Selector from './selector';
import getStateStore from '../state-store';
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
    this.appState = getStateStore();
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
      let layerId = layer['@id'];
      let layerIndex = this.appState.getObject('layerIndexMap')[layerId];
      let colorClass = typeof layerIndex === 'number' ? 'layer_' + layerIndex % 10 : undefined;
      
      _this.selector.addItem({
        label: layer.label,
        value: layerId,
        colorClass: colorClass
      });
    }
    return new Promise(function(resolve, reject) {
      if (layers.length > 0) {
        const layerId = _this.initialLayerId || layers[0]['@id'];
        const layerIndex = _this.appState.getObject('layerIndexMap')[layerId];
        _this.selector.val(layerId, true);
        _this.selector.setColorClass('layer_' + layerIndex % 10);
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
    this.selector.changeCallback = function(layerId, text) {
      const layerIndex = _this.appState.getObject('layerIndexMap')[layerId];
      
      _this.selector.setColorClass('layer_' + layerIndex % 10);
      getUserSettings().set('lastSelectedLayer', layerId);
      if (typeof _this.changeCallback === 'function') {
        _this.changeCallback(layerId, text);
      }
    };
  }
}
