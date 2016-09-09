import YaleEndpoint from '../annotation/yale-endpoint';
import YaleDemoEndpoint from '../annotation/yale-demo-endpoint';
import AnnotationEditor from '../annotation/annotation-editor';

(function ($) {
  
  // Exposing names to Mirador core.
  
  $.YaleEndpoint = YaleEndpoint;
  $.YaleDemoEndpoint = YaleDemoEndpoint;
  $.AnnotationEditor = AnnotationEditor;
  
})(Mirador);
