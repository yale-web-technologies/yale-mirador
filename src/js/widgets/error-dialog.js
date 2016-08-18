export default function getErrorDialog() {
  if (!instance) {
    instance = new ErrorDialog(jQuery('#ym_error_dialog'));
  }
  return instance;
};

class ErrorDialog {
  constructor(elem) {
    this.elem = elem;
    elem.addClass('ui modal ym_modal');
    elem.modal({
      onHidden: function() {
        elem.modal('hide dimmer');
      }
    });
  }
  
  show(errorId) {
    switch (errorId) {
      case 'layers':
        this.elem.html(template({ message: MSG_LAYERS }));
        break;
      case 'annotations':
        this.elem.html(template({ message: MSG_ANNOTATIONS }));
        break;
      default:
        console.log('ErrorDialog#show invalid errorId: ' + errorId);
        return;
    }
    this.elem.modal('show');
  }
  
  hide() {
    this.elem.modal('hide');
  }
  
  _errorGettingLayers() {
    
  }
}

let instance = null;

const template = Handlebars.compile([
  '<div class="header">Error</div>',
  '<div class="content">',
  '  <div class="description">',
  '    <p>{{message}}</p>',
  '    <p>Please try again a bit later, or if problem persists, create an issue at <a class="ym_link" target="_blank" href="https://github.com/yale-web-technologies/mirador-project/issues">GitHub</a>.</p>',
  '  </div>',
  '</div>',
  '<div class="actions">',
  '  <div class="ui cancel button">Dismiss</div>',
  '</div>'
].join(''));

const MSG_LAYERS = 'Sorry, there was a problem retrieving the annotation layers.';
const MSG_ANNOTATIONS = 'Sorry, there was a problem retrieving the annotations.';
