export default function getErrorDialog() {
  if (!instance) {
    const id = 'ym_error_dialog';
    let elem = jQuery('#' + id);
    if (elem.size() === 0) {
      elem = jQuery('<div/>').attr('id', 'ym_error_dialog')
        .addClass('ui modal ym_modal');
      jQuery('body').append(elem);
    }
    instance = new ErrorDialog(elem);
  }
  return instance;
};

class ErrorDialog {
  constructor(elem) {
    this.elem = elem;
    elem.modal({
      onHidden: function() {
        elem.modal('hide dimmer');
      }
    });
    this.messageMap = {
      layers: '<p>Sorry, there was a problem retrieving the annotation layers.</p>' + MSG_TRY_LATER,
      annotations: '<p>Sorry, there was a problem retrieving the annotations.</p>' + MSG_TRY_LATER,
      authz_create: '<p>Sorry, you are not authorized to create annotations.</p>',
      authz_update: '<p>Sorry, you are not authorized to update data.</p>',
      authz_delete: '<p>Sorry, you are not authorized to delete data.</p>'
    };
  }
  
  show(errorId) {
    const message = this.messageMap[errorId] || 'Undefined error.';
    this.elem.html(template({ message: message }));
    this.elem.modal('show');
  }
  
  hide() {
    this.elem.modal('hide');
  }
}

let instance = null;

const template = Handlebars.compile([
  '<div class="header">Error</div>',
  '<div class="content">',
  '  <div class="description">',
  '    {{{message}}}',
  '  </div>',
  '</div>',
  '<div class="actions">',
  '  <div class="ui cancel button">Dismiss</div>',
  '</div>'
].join(''));

const MSG_TRY_LATER = '<p>Please try again a bit later, or if problem persists, create an issue at <a class="ym_link" target="_blank" href="https://github.com/yale-web-technologies/mirador-project/issues">GitHub</a>.</p>';