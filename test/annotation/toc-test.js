import Toc from '../../src/js/annotation/toc';
import annoUtil from '../../src/js/annotation/anno-util';
import util from '../test-util';

const expect = require('chai').expect;

describe('ToC', function() {
  
  let spec = null;
  let annotations = [];
  
  beforeEach(function() {
    spec = {
      shortLabelSeparator: '.',
      nodeSpecs: [
        [ { tag: 'chapter1', label: 'Chapter 1', short: '1' },
          { tag: 'chapter2', label: 'Chapter 2', short: '2' } ],
        [ { tag: 'scene1', label: 'Scene 1', short: '1' },
          { tag: 'scene2', label: 'Scene 2', short: '2' } ]
      ]
    };
    annotations = [
      util.createAnnotation({ chars: 'C1',  tags: ['chapter1'] }),
      util.createAnnotation({ chars: '1.1',  tags: ['chapter1', 'scene1'] }),
      util.createAnnotation({ chars: '1.2',  tags: ['chapter1', 'scene2'] }),
      util.createAnnotation({ chars: 'C2',  tags: ['chapter2'] }),
      util.createAnnotation({ chars: '2.1',  tags: ['chapter2', 'scene1'] }),
      util.createAnnotation({ chars: '2.2',  tags: ['chapter2', 'scene2'] })
    ];
  });
  
  it('should generate a correct ToC structure', function() {
    let toc = new Toc(spec, annotations);
    let node = toc.getNode('chapter1', 'scene2');
    expect(node.spec.tag).to.equal('scene2');
    expect(node.spec.label).to.equal('Scene 2');
    expect(node.spec.short).to.equal('2');
    expect(annoUtil.getAnnotationText(node.annotation)).to.equal('1.2');
  });
});
