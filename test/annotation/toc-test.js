import Toc from '../../src/js/annotation/toc';
import util from '../test-util';

var expect = require('chai').expect;

describe('TOC', function() {
  
  var spec = null;
  
  beforeEach(function() {
    spec = [
      [ { "label": "Chapter 1", "tag" : "chapter1" }, 
        { "label": "Chapter 2", "tag" : "chapter2" } ],
      [ { "label": "Scene 1", "tag" : "scene1" }, 
        { "label": "Scene 2", "tag" : "scene2" } ]
    ];
  });
  
  xit('should do something', function() {
    expect(1).to.equal(2);
  });
});
