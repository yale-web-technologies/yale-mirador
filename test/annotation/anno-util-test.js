import annoUtil from '../../src/js/annotation/anno-util';
import util from '../test-util';

var assert = require('assert');

describe('getAnnotationText', function() {
  it('should get correct text from the annotation object', function() {
    var text = '<p>Chapter 1</p>';
    var anno = util.createAnnotation({ chars: text });
    var annoText = annoUtil.getAnnotationText(anno);
    assert.equal(annoText, text);
  });
});
