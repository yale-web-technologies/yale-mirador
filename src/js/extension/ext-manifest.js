import getLogger from '../util/logger';
import getStateStore from '../state-store';

(function($) {
  const logger = getLogger();
  let copyrightedImageServiceUrl = '';
  let width = 1, height = 1;

  $.Manifest.prototype.processCopyright = function(jsonLd) {
    logger.debug('Manifest#processCopyright jsonLd in:', jsonLd);

    if (getStateStore().getSetting('auth', 'images', 'copyrighted')) {
      copyrightedImageServiceUrl = getStateStore().getSetting('auth', 'images', 'altImageService');

      [width, height] = getReplacementDimensions(jsonLd);
      const sequences = jsonLd.sequences;
      for (let sequence of sequences) {
        processSequence(sequence);
      }
    }
    logger.debug('Manifest#processCopyright jsonLd out:', jsonLd);
    return jsonLd;
  };

  function getReplacementDimensions(manifest) {
    let maxWidth = 0, maxHeight = 0;

    for (let sequence of manifest.sequences) {
      for (let canvas of sequence.canvases) {
        if (canvas.width > maxWidth) {
          maxWidth = canvas.width;
        }
        if (canvas.height > maxHeight) {
          maxHeight = canvas.height;
        }
      }
    }
    // Since the image is 2048x2048, conversion to bigger than 4096x4096 is
    // not supported by the Loris server
    let side = Math.min(Math.max(maxWidth, maxHeight), 4096);
    return [side, side];
  }

  function processSequence(sequence) {
    const canvases = sequence.canvases;
    for (let canvas of canvases) {
      processCanvas(canvas);
    }
  }

  function processCanvas(canvas) {
    const images = canvas.images;

    canvas.width = width;
    canvas.height = height;

    for (let image of images) {
      processImage(image);
    }
  }

  function processImage(image) {
    const resource = image.resource;
    resource['@id'] = copyrightedImageServiceUrl + '/full/' + width + ',' + height + '/0/default.jpg';
    resource.service['@id'] = copyrightedImageServiceUrl;
    resource.width = String(width);
    resource.height = String(height);
  }

})(Mirador);
