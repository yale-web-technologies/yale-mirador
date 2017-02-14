import getLogger from '../util/logger';
import MiradorProxy from './mirador-proxy';
import WindowProxy from './window-proxy';

class MiradorProxyManager {
  constructor() {
    this.logger = getLogger();

    // Mirador instance doesn't have an ID. The ID here is conferred by
    // the MiradorProxyManager.
    this._miradorProxiesMap = {}; // Mirador instances { id: miradorInstance }
  }

  addMirador(miradorId, mirador) {
    this.logger.debug('MiradorProxyManager#addMirador', mirador);
    const miradorProxy = this._miradorProxiesMap[miradorId];
    if (miradorProxy) {
      throw 'MiradorProxyManager#addMirador duplicate ID ' + miradorId;
    } else {
      this._miradorProxiesMap[miradorId] = new MiradorProxy(mirador);
    }
  }

  getMiradorProxies() {
    return Object.values(this._miradorProxiesMap);
  }

  getMiradorProxy(miradorId) {
    return this._miradorProxiesMap[miradorId] || null;
  }

  /**
   * @returns {WindowProxy[]} a list of window proxies for all windows in all Mirador instances
   */
  getAllWindowProxies() {
    let windowProxies = [];

    for (let miradorProxy of Object.values(this._miradorProxiesMap)) {
      windowProxies = windowProxies.concat(miradorProxy.getWindowProxies());
    }
    return windowProxies;
  }

  getWindowProxyById(windowId) {
    this.logger.debug('MiradorProxyManager#getWindowProxyById windowId:', windowId);
    return (new WindowProxy(this.getWindowById(windowId)));
  }

  getWindowById(windowId) {
    this.logger.debug('MiradorProxyManager#getWindowById windowId:', windowId);
    let window = null;

    for (let miradorProxy of Object.values(this._miradorProxiesMap)) {
      window = miradorProxy.getWindowById(windowId);
      if (window) {
        return window;
      }
    }
    return null;
  }

  getCurrentCanvasIdByWindowId(windowId) {
    const windowProxy = this.getWindowProxyById(windowId);
    if (windowProxy) {
      return windowProxy.getCurrentCanvasId();
    } else {
      return null;
    }
  }

  // XXX This works because only one Mirador window is assumed.
  // It should be refactored later.
  anyId() {
    return Object.keys(this._miradorProxies)[0];
  }

  // Subscribe to the same event from all Mirador instances
  subscribe(eventName, callback) {
    this.logger.debug('MiradorProxyManager#subscribe ', eventName, callback);
    for (let miradorProxy of Object.values(this._miradorProxiesMap)) {
      miradorProxy.subscribe(eventName, callback);
    }
  }
}

let instance = null;

function getMiradorProxyManager(destroyOld) {
  if (!instance || destroyOld) {
    instance = new MiradorProxyManager();
  }
  return instance;
};

export default getMiradorProxyManager;

Mirador.getMiradorProxyManager = getMiradorProxyManager; // to be called from Mirador core.
