import getModalAlert from 'widgets/modal-alert';

const msgTemplate = Handlebars.compile([
  '<p>{{message}} ({{code}})<p>',
  '{{#if tryAgain}}',
  '  <p>Please try again by reloading the page. If problem persists, contact the site administrator.</p>',
  '{{/if}}'
].join(''));

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

const MSG_TRY_LATER = '<p>Please try again by reloading the page, or if problem persists, contact the site administrator.</p>';

class ErrorDialog {
  constructor(elem, statusAlert) {
    this.elem = elem;
    elem.modal({
      onHidden: function() {
        elem.modal('hide dimmer');
      }
    });
    this.messageMap = {
      layers: '<p>Sorry, there was a problem retrieving the annotation layers.</p>' + MSG_TRY_LATER,
      annotations: '<p>Sorry, there was a problem retrieving the annotations.</p>' + MSG_TRY_LATER,
      anno_read: "<p>Failed to retrieve annotations</p>",
      authz_read: "<p>Failed to retrieve annotations: user doesn't have permission to read",
      authz_create: '<p>Sorry, you are not authorized to create annotations.</p>',
      authz_update: '<p>Sorry, you are not authorized to update data.</p>',
      authz_delete: '<p>Sorry, you are not authorized to delete data.</p>'
    };
    this._alert = statusAlert || getModalAlert();
  }

  show(code, message, tryAgain) {
    this._alert.hide(); // hide an alert window if it's present
    console.log('yyy code:', code, message, tryAgain);
    const msg = msgTemplate({ code, message, tryAgain });
    console.log('yyy msg:', msg);
    this.elem.html(template({ message: msg }));
    this.elem.modal('show');
  }

  hide() {
    this.elem.modal('hide');
  }
}

let instance = null;

export default function getErrorDialog() {
  if (!instance) {
    const id = 'ym_error_dialog';
    let elem = jQuery('#' + id);
    if (elem.length === 0) {
      elem = jQuery('<div/>').attr('id', id)
        .addClass('ui modal ym_modal')
        .appendTo(jQuery('body'));
    }
    instance = new ErrorDialog(elem);
  }
  return instance;
};
