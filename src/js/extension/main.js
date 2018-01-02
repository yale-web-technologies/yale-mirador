import AnnotationEditor from 'widgets/annotation-editor';
import AnnotationTableOfContents from './annotation-table-of-contents';
import {YaleEndpoint} from 'annotations/yale-endpoint';

import './dialog-builder';
import './ext-global';
import './ext-hud';
import './ext-image-view';
import './ext-manifest';
import './ext-osd-region-draw-tool';

/**
 * Make global names available to Mirador.
 */
(function($) {

  $.AnnotationEditor = AnnotationEditor;
  $.AnnotationTableOfContents = AnnotationTableOfContents;
  $.YaleEndpoint = YaleEndpoint;

})(Mirador);
