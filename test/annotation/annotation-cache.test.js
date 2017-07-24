import { expect } from 'chai';

import getAnnotationCache from '../../src/js/annotation-data/annotation-cache';
import util from '../test-helpers/test-util';

describe('AnnotationCache', function() {
  let cache = null;

  beforeEach(function(done) {
    getAnnotationCache().then(function(instance) {
      cache = instance;
      cache.deleteDb().then(function() {
        cache.init().then(() => done());
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
