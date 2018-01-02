import svgUtil from 'annotations/svg-util';

import { expect } from 'chai';

// XXX these svg manipulations will probably not needed
// because multiple paths under in a single target will probably turn out to
// be illegal according to IIIF spec.

/*
describe('mergeSvgs', function() {
  it('merge single path with single', function() {
    const svg1 = '<svg><path d="M1,1,2,1,2,2z"/></svg>';
    const svg2 = '<svg><path d="M4,1,5,1,5,2z"/></svg>';
    const svg3 = svgUtil.mergeSvgs(svg1, svg2);
    expect(svg3).to.equal('<svg><g><path d="M1,1,2,1,2,2z"/><path d="M4,1,5,1,5,2z"/></g></svg>');
  });

  it('merge single path with group', function() {
    const svg1 = '<svg><path d="M1,1,2,1,2,2z"/></svg>';
    const svg2 = '<svg><g><path d="M4,1,5,1,5,2z"/><path d="M1,4,2,4,2,5z"/></g></svg>';
    const svg3 = svgUtil.mergeSvgs(svg1, svg2);
    expect(svg3).to.equal('<svg><g><path d="M1,1,2,1,2,2z"/><path d="M4,1,5,1,5,2z"/><path d="M1,4,2,4,2,5z"/></g></svg>');
  });

  it('merge group with single path', function() {
    const svg1 = '<svg><g><path d="M1,1,2,1,2,2z"/><path d="M1,4,2,4,2,5z"/></g></svg>';
    const svg2 = '<svg><path d="M4,1,5,1,5,2z"/></svg>';
    const svg3 = svgUtil.mergeSvgs(svg1, svg2);
    expect(svg3).to.equal('<svg><g><path d="M1,1,2,1,2,2z"/><path d="M1,4,2,4,2,5z"/><path d="M4,1,5,1,5,2z"/></g></svg>');
  });

  it('merge group with group', function() {
    const svg1 = '<svg><g><path d="M1,1,2,1,2,2z"/><path d="M1,4,2,4,2,5z"/></g></svg>';
    const svg2 = '<svg><g><path d="M4,1,5,1,5,2z"/><path d="M4,4,5,4,5,5z"/></g></svg>';
    const svg3 = svgUtil.mergeSvgs(svg1, svg2);
    expect(svg3).to.equal('<svg><g><path d="M1,1,2,1,2,2z"/><path d="M1,4,2,4,2,5z"/><path d="M4,1,5,1,5,2z"/><path d="M4,4,5,4,5,5z"/></g></svg>');
  });

});
*/
