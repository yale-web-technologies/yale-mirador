import AnnotationEditor from '../widgets/annotation-editor';
import {AnnotationExplorerDialog} from '../import';
import AnnotationSource from '../annotation-data/annotation-source';
import getApp from '../app';
import {AnnotationExplorer} from '../import';
import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import YaleEndpoint from '../annotation-data/yale-endpoint';

// Exposes names to Mirador core.
(function ($) {
  $.ym = {};

  $.YaleEndpoint = YaleEndpoint;
  $.AnnotationEditor = AnnotationEditor;

  /**
    * @param {string} windowId ID of Mirador window from which this dialog is being created
    */
  $.ym.openAnnotationExplorer = async function(windowId) {
    const windowProxy = getMiradorProxyManager().getWindowProxyById(windowId);
    const svgOverlay = windowProxy.getSvgOverlay();
    svgOverlay.removeMouseTool();
    const endpoint = windowProxy.getEndPoint();
    const annoSource = getApp().getAnnotationSource();
    const annotationExplorer = new AnnotationExplorer({
      dataSource: annoSource
    });
    const layers = await annotationExplorer.getLayers();

    return new Promise(function(resolve, reject) {
      const dialog = new AnnotationExplorerDialog({
        appendTo: jQuery('body'),
        annotationExplorer: annotationExplorer,
        canvases: windowProxy.getCanvases(),
        defaultCanvasId: windowProxy.getCurrentCanvasId(),
        layers: layers,
        onSelect: annotation => {
          resolve(annotation);
        },
        logger: getLogger()
      });
      dialog.open();
    }).then(annotation => {
      svgOverlay.setMouseTool();
      return annotation;
    }).catch(reason => {
      svgOverlay.setMouseTool();
      logger.error('openAnnotationExplorer returned with error', reason);
    });
  };

})(Mirador);
