import { expect } from 'chai';

import { StateStore } from '../src/js/state-store';

describe('StateStore', () => {
  describe('getSetting', () => {
    let state = null;

    beforeEach(() => {
      state = new StateStore();
      state.init({
        auth: {
          isEditor: true,
          groupId: 100
        },
        mirador: {
          buildPath: '/build/mirador'
        }
      });
    });

    it('gets correct value for existing setting', () => {
      expect(state.getSetting('auth', 'isEditor')).to.be.true;
      expect(state.getSetting('auth', 'groupId')).to.equal(100);
      expect(state.getSetting('mirador', 'buildPath')).to.equal('/build/mirador');
    });

    it('returns undefined for invalid keys', () => {
      expect(state.getSetting('mirador', 'whatever')).to.be.undefined;
      expect(state.getSetting('something')).to.be.undefined;
    });
  });
});
