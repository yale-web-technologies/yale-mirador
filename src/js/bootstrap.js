import App from './app';

jQuery(document).ready(function() {
  console.log('Yale Mirador Extension document ready');
  if (jQuery('#ym_grid').length > 0) {
    const app = new App('ym_grid');
  }
});
