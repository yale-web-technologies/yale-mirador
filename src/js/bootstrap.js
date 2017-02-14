import App from './app';
import getLogger from './util/logger';

// Separated this code out to its own file because it shouldn't run with the test.
jQuery(document).ready(function() {
  getLogger().info(window._YaleMiradorVersion);
  if (jQuery('#ym_grid').length > 0) {
    const app = new App({
      rootElement: 'ym_grid',
      dataElement: jQuery('#\\{\\{id\\}\\}') // {{id}} gets replaced with the Mirador instance ID by the Grid
    });
    app.init();
  }
});
