export default function getModalAlert() {
  if (!instance) {
    instance = new ModalAlert();
  }
  return instance;
};

class ModalAlert {
  constructor() {
    this.dimmer = this.addDimmer();
    this.panel = this.addPanel();
  }

  addDimmer() {
    return jQuery('<div/>')
      .addClass('ym-dimmer')
      .appendTo(jQuery('body'));
  }

  addPanel() {
    return jQuery('<div/>')
      .attr('id', 'ym-modal-alert')
      .addClass('ym-message-panel')
      .appendTo(jQuery('body'));
  }

  show(text) {
    this.dimmer.show();
    this.panel.text(text);
    this.panel.show();
    return new Promise((resolve, reject) => {
      // Somehow the panel fails to show itself most of the times if we don't add some wait here
      // TODO: identify the cause
      setTimeout(() => {
        resolve();
      }, 50);
    });
  }

  hide() {
    this.panel.hide();
    this.dimmer.hide();
  }
}

let instance = null;
