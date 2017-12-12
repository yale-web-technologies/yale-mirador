import { expect } from 'chai';

import util from '../test-helpers/test-util';

import { YaleEndpoint } from 'annotation-data/yale-endpoint';

describe('YaleEndpoint', () => {
  let endpoint = null;
  let annotationExplorer = null;

  beforeEach(() => {
    annotationExplorer = {};
    endpoint = new YaleEndpoint({
      explorer: annotationExplorer
    });
  });

  describe('search', () => {
    xit('handles 401 error', () => {
    });
  });
});
