import {expect} from 'chai';
import getLogger from '../../src/js/util/logger';
import getStateStore from '../../src/js/state-store';
import MenuTagSelector from '../../src/js/widgets/menu-tag-selector';

describe('LayerSelector', () => {

  beforeEach(function() {
    getLogger().setLogLevel(getLogger().DEBUG);
    jQuery(document.body).append(jQuery('<div/>').attr('id', 'menu_tag_selector'));
  });

  it('should remember last selected layer', () => {
    const mockExplorer = {
      getAnnotationToc: () => {
        return {
          annoHierarchy: {
            isRoot: true,
            childNodes: {
              chapter1: {
                annotation: { '@id': 'anno1' },
                childAnnotations: [],
                childNodes: {
                  scene1: {
                    annotation: { '@id': 'anno1.1' },
                    childAnnotations: [],
                    cumulativeTags: ['chapter1', 'scene1'],
                    layerIds: new Set(['layer1']),
                    spec: {label: 'Scene 1', short: '1', tag: 'scene1'}
                  },
                  scene2: {
                    annotation: { '@id': 'anno1.2' },
                    childAnnotations: [],
                    cumulativeTags: ['chapter1', 'scene2'],
                    layerIds: new Set(['layer1']),
                    spec: {label: 'Scene 2', short: '1', tag: 'scene2'}
                  }
                },
                cumulativeTags: ['chapter1'],
                layerIds: new Set(['layer1']),
                spec: {label: 'Chapter 1', short: '1', tag: 'chapter1'}
              },
              chapter2: {
                annotation: { '@id': 'anno1' },
                childAnnotations: [],
                childNodes: {},
                cumulativeTags: ['chapter2'],
                layerIds: new Set(['layer1']),
                spec: {label: 'Chapter 2', short: '2', tag: 'chapter2'}
              }
            }
          }
        };
      }
    };

    const element = jQuery('#menu_tag_selector');
    const selector = new MenuTagSelector({
      parent: element,
      annotationExplorer: mockExplorer
    });
    const menuItems = element.find('.item');
    console.log('Element:', element[0].outerHTML);
    for (let item of menuItems.toArray()) {
      console.log('Item:', item.outerHTML);
    }
  });
});
