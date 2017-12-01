import { expect } from 'chai';

import util from '../test-helpers/test-util';

import { YaleEndpoint } from 'annotation-data/yale-endpoint';

describe('YaleEndpoint', () => {
  let endpoint = null;

  beforeEach(function() {
    const options = {};
    endpoint = new YaleEndpoint(options);
  });

  describe('error handling', () => {
    it('dodo', function() {
      expect(1).to.equal(1);
    });
  });
});
