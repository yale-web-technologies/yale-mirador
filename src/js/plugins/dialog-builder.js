/**
 * Overrides the same-named file in Mirador core to prevent
 * Bootstrap or Bootbox code being called, which collides with Semantic UI.
 */
 
(function ($) {

  var template = Handlebars.compile([
    '<div class="header">Error</div>',
    '<div class="content">',
    '  <div class="description">',
    '    <p>{{message}}</p>',
    '  </div>',
    '</div>',
    '<div class="actions">',
    '  <div class="ui cancel button">Dismiss</div>',
    '</div>'
  ].join(''));
    
  $.DialogBuilder = function (container) {
    this.element = jQuery('#ym_dialog');
    this.element.addClass('ui modal ym_modal');
  };

  $.DialogBuilder.prototype = {
    
    confirm: function (message, callback) {
      var result = window.confirm(message);
      callback(result);
    },
    
    dialog: function(opts){
      console.log('DialogBuilder#dialog');
    }
  };

})(Mirador);
