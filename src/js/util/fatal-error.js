// Show messages for an irrecoverable error after wiping out everything
export default function fatalError(...args) {
  const rootElem = jQuery(template());
  for (let arg of args) {
    rootElem.append(jQuery('<p>' + arg + '</p>'));
  }
  jQuery(document.body).empty().append(rootElem);
}

const template = Handlebars.compile([
  '<div class="fatal_error">',
  '  <div class="header">Error</div>',
  '</div>',
].join(''));
