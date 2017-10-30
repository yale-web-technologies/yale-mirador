// Expose global variables to ES5

import getApp from './app';
import fatalError from './util/fatal-error';

window.YaleMirador = {
  getApp: getApp,
  fatalError: fatalError
};


