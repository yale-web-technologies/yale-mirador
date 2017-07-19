import './ext-image-view';
import './ext-manifest';
import './ext-osd-region-draw-tool';
import './dialog-builder';
import AnnotationTableOfContents from './annotation-table-of-contents';

/**
 * Make global names available to Mirador.
 */
(function($) {

  $.AnnotationTableOfContents = AnnotationTableOfContents;

})(Mirador);
