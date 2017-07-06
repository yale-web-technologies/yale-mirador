import {Anno} from '../import';
import AnnotationEditor from '../widgets/annotation-editor';
import getLogger from '../util/logger';
import getStateStore from '../state-store';
import util from '../util/util';
import YaleEndpoint from '../annotation-data/yale-endpoint';

(function($) {

  $.yaleExt = $.yaleExt || {};

  // Exposing modules defined in Mirador config
  $.YaleEndpoint = YaleEndpoint;
  $.AnnotationEditor = AnnotationEditor;

  const logger = getLogger();

  jQuery.extend($.yaleExt, {

    // Get bounds of multiple paper.js shapes.
    getCombinedBounds: function(shapes) {
      logger.debug('yaleExt.getCombinedBounds shapes:', shapes);
      var bounds = null;
      jQuery.each(shapes, function (index, shape) {
        if (bounds) {
          bounds = bounds.unite(shape.strokeBounds);
        } else {
          bounds = shape.strokeBounds;
        }
        logger.debug('index: ' + index + ', bounds: ' + bounds);
      });
      return bounds;
    },

    updateTooltipStyles: function() {
      const elem = jQuery('.qtip-default, .qtip-content');
      const styles = getStateStore().getTransient('tooltipStyles');
      if (styles) {
        elem.css('color', styles.color);
        elem.css('background-color', styles.backgroundColor);
        elem.css('border', styles.border);
      }
    },

    truncate: function(html, maxLen) {
      let text = html.replace(/<(?:.|\n)*?>/gm, '');
      text = text.replace(/&.*?;/gm, '');
      if (text.length > maxLen) {
        return text.slice(0, maxLen-3) + '...';
      } else {
        return text;
      }
    }
  });

})(Mirador);
