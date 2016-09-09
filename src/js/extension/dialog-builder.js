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
    '  <div class="ui ok button">{{yesLabel}}</div>',
    '  <div class="ui cancel button">{{noLabel}}</div>',
    '</div>'
  ].join(''));
    
  $.DialogBuilder = function (container) {
    var id = 'ym_dialog';
    var elem = jQuery('#' + id);
    if (elem.size() === 0) {
      elem = jQuery('<div/>')
        .attr('id', id)
        .addClass('ui modal ym_modal')
        .appendTo(jQuery('body'));
    }
    this.elem = elem;
  };

  $.DialogBuilder.prototype = {
    
    confirm: function (message, callback) {
      var result = window.confirm(message);
      callback(result);
    },
    
    dialog: function(opts){
      console.log('DialogBuilder#dialog');
      var yes = opts.buttons.yes;
      var no = opts.buttons.no;
      
      this.elem.html(template({ 
        message: opts.message,
        yesLabel: yes.label,
        noLabel: no.label
      }));
      this.elem.modal({
        onApprove: function(elem) {
          if (typeof yes.callback === 'function') {
            yes.callback();
          }
        },
        onDeny: function(elem) {
          if (typeof no.callback === 'function') {
            no.callback();
          }
        }
      });
      this.elem.modal('show');
    }
  };

})(Mirador);
