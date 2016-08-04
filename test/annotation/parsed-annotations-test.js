import ParsedAnnotations from '../../src/js/annotation/parsed-annotations';
import util from '../test-util';

var expect = require('chai').expect;

describe('ParsedAnnotations', function() {
  
  var tagHierarchy = null;
  
  beforeEach(function() {
    tagHierarchy = [
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
