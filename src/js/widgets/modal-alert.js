export default function getModalAlert() {
  if (!instance) {
    const id = 'ym_modal_alert';
    let elem = jQuery('#' + id);
    if (elem.length === 0) {
      elem = jQuery('<div/>').attr('id', id)
        .addClass('ui modal ym_modal')
        .appendTo(jQuery('body'));
    }
    instance = new ModalAlert(elem);
  }
  return instance;
};

class ModalAlert {
  constructor(elem) {
    this.elem = elem;
    elem.html(template());
    elem.modal({ 
      closable: false,
      allowMultiple: true,
      duration: 0,
      dimmerSettings: {
        opacity: 0.5
      }
    });
  }
  
  show() {
    this.elem.modal('show');
  }
  
  hide() {
    this.elem.modal('hide');
  }
}

let instance = null;

const template = Handlebars.compile([
  'Loading annotations ...'
].join(''));