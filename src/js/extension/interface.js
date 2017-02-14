import AnnotationEditor from '../widgets/annotation-editor';
import {AnnotationExplorerDialog} from '../import';
import AnnotationSource from '../annotation-data/annotation-source';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import YaleEndpoint from '../annotation-data/yale-endpoint';

// Exposes names to Mirador core.
(function ($) {
  $.ym = {};

  $.YaleEndpoint = YaleEndpoint;
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
