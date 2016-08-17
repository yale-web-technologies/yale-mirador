export default function getModalAlert() {
  if (!instance) {
    instance = new ModalAlert(jQuery('#ym_modal'));
  }
  return instance;
};

class ModalAlert {
  constructor(elem) {
    this.elem = elem;
    elem.html(template());
    elem.modal({ closable: false});
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