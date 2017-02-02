import App from './app';

// Separated this code out to its own file because it shouldn't run with the test.
jQuery(document).ready(function() {
  //console.log('Yale Mirador Extension document ready');
  if (jQuery('#ym_grid').length > 0) {
    const app = new App({
      rootElement: 'ym_grid',
      dataElement: jQuery('#\\{\\{id\\}\\}')
    });
    app.init();
  }
});
