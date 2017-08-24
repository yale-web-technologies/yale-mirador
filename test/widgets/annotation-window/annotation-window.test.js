import { expect } from 'chai';

import AnnotationListWidget from '../../../src/js/widgets/annotation-window/annotation-list-widget';
import AnnotationWindow from '../../../src/js/widgets/annotation-window/annotation-window';
import getMiradorProxyManager from '../../../src/js/mirador-proxy/mirador-proxy-manager';
import getStateStore from '../../../src/js/state-store';

describe('AnnotationWindow', function() {
  let parent = null;
  let annotationRenderer = null;
  let proxyMgr = null;
  let mockMirador = null;
  let mockAnnotationExplorer = null;
  let state = null;

  beforeEach(function() {
    document.body.insertAdjacentHTML('afterbegin', '<div id="parent"></div>');
    document.body.insertAdjacentHTML('afterbegin', '<div id="windowId"></div>');
    proxyMgr = getMiradorProxyManager(true);
    mockMirador = {
      viewer: {
        workspace: {
          windows: [{
            id: 'window1',
            canvasID: 'canvas1',
            manifest: {
              getCanvases: () => [{ '@id': 'canvas1' }]
            }
          }]
        }
      },
      eventEmitter: {
        subscribe: () => {}
      }
    };
    proxyMgr.addMirador('mirador1', mockMirador);
    mockAnnotationExplorer = {
      getAnnotationToc: () => {},
      getLayers: () => { return Promise.resolve().then(() => {
        return [ { '@id': 'layer1', label: 'Layer 1' }];
      }); }
    };
    state = getStateStore(true);
    state.setObject('layerIndexMap', { layer1: 0 });
  });

  it('something', function() {
    const canvasWindowId = 'window1';
    const annoWin = new AnnotationWindow({
      miradorId: 'mirador1',
      canvasWindowId: canvasWindowId,
      appendTo: jQuery('#parent'),
      explorer: mockAnnotationExplorer,
      initialLayerId: null,
      initialTocTags: null,
      annotationId: null
    });
    annoWin.init();
  });
});
