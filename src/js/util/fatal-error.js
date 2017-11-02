// Show messages for an irrecoverable error after wiping out everything
export default function fatalError(error, ...args) {
  console.error('ERROR:', error);
  const rootElem = jQuery(template());
  if (error === 'FATAL') {
    throw error;
  } else {
    args.push(error);
    for (let arg of args) {
      rootElem.append(jQuery('<p>' + arg + '</p>'));
    }
    jQuery(document.body).empty().append(rootElem);
    throw 'FATAL';
  }
}

const template = Handlebars.compile([
  '<div class="fatal_error">',
  '  <div class="header">Error</div>',
  '</div>',
].join(''));
