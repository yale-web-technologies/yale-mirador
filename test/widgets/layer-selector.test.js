import {expect} from 'chai';
import getStateStore from '../../src/js/state-store';
import LayerSelector from '../../src/js/widgets/layer-selector';

describe('LayerSelector', () => {

  let state = getStateStore();

  beforeEach(function() {
    jQuery(document.body).append(jQuery('<div/>').attr('id', 'layer_selector'));
  });

  it('should remember last selected layer', (done) => {
    const element = jQuery('#layer_selector');
    const layers = [
      { '@id': 'https://example.org/layers/1' , label: 'Layer 1' },
      { '@id': 'https://example.org/layers/2' , label: 'Layer 2' }
    ];
    const selector = new LayerSelector({ parent: element });
    selector.init(layers).then(() => {
      const menuItems = element.find('.item');
      jQuery(menuItems[1]).click();
      expect(state.getString('lastSelectedLayer')).to.equal(layers[1]['@id']);
      jQuery(menuItems[0]).click();
      expect(state.getString('lastSelectedLayer')).to.equal(layers[0]['@id']);
      done();
    });
  });
});
