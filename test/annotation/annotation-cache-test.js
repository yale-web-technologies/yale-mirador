import getAnnotationCache from '../../src/js/annotation/annotation-cache';
import util from '../test-util';

import { expect } from 'chai';

describe('AnnotationCache', function() {
  let cache = getAnnotationCache();
  
  beforeEach(function(done) {
    cache.clear().then(function() {
      cache.init().then(function() {
        done();
      });
    });
    
  });
  
  it('setAnnotationsPerCanvas', function(done) {
    const data1 = { layer_id: '/layer1', annotations: { '@id': '/annotation1' }};
    cache.setAnnotationsPerCanvas('/canvas1', data1).then(function() {
      cache.getAnnotationsPerCanvas('/canvas1').then(function(jsonData) {
        expect(jsonData).to.deep.equal(data1);
        done();
      });
    });
  });
});
