import {AnnotationExplorerDialog} from '../import';

import YaleEndpoint from '../annotation/yale-endpoint';
import YaleDemoEndpoint from '../annotation/yale-demo-endpoint';
import AnnotationEditor from '../annotation/annotation-editor';
import AnnotationSource from '../annotation/annotation-source';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';

// Exposes names to Mirador core.
(function ($) {
  $.ym = {};
  
  $.YaleEndpoint = YaleEndpoint;
  $.YaleDemoEndpoint = YaleDemoEndpoint;
  $.AnnotationEditor = AnnotationEditor;
  //$.annoUtil = annoUtil;
  
  /**
    * @param {string} windowId ID of Mirador window from which this dialog is being created
    */
  $.ym.openAnnotationExplorer = function(windowId) {
    return new Promise(function(resolve, reject) {
      const windowProxy = getMiradorProxyManager().getWindowProxyById(windowId);
      const endpoint = windowProxy.getEndPoint();
      const annoSource = new AnnotationSource({endpoint: endpoint});
      const dialog = new AnnotationExplorerDialog({
        appendTo: jQuery('body'),
        dataSource: annoSource,
        canvases: windowProxy.getCanvases(),
        defaultCanvasId: windowProxy.getCurrentCanvasId(),
        onSelect: function(annotation) {
          resolve(annotation);
        }
      });
      dialog.open();
    });
  };
  
})(Mirador);
