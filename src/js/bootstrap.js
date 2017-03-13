import getApp from './app';
import getLogger from './util/logger';

const logger = getLogger();

// Separated this code out to its own file because it shouldn't run with the test.
jQuery(document).ready(function() {
  logger.info(window._YaleMiradorVersion);
  if (jQuery('#ym_grid').length > 0) {
    getApp().init().catch(reason => {
      const msg = 'ERROR failed to init Mirador - ' + reason;
      alert(msg);
    });
  }
});
