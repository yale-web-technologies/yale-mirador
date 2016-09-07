import MiradorProxy from './mirador-proxy';

class MiradorProxyManager {
  constructor() {
    this.miradorProxies = {}; // Mirador instances
  }

  addMirador(id, mirador) {
    this.miradorProxies[id] = new MiradorProxy(mirador);
  }
  
  getMiradorProxies() {
    return this.miradorProxies;
  }
  
  getMiradorProxy(miradorId) {
    return this.miradorProxies[miradorId];
  }
  
  getWindowById(windowId) {
    let window = null;
    jQuery.each(this.miradorProxies, function(miradorId, miradorProxy) {
      window = miradorProxy.getWindowById(windowId);
      if (window) {
        return false;
      }
    });
    return window;
  }
  
  // XXX This works because only one Mirador window is assumed. 
  // It should be refactored later.
  anyId() { 
    return Object.keys(this.miradorProxies)[0];
  }
}

let _instance = null;

function getMiradorProxyManager() {
  if (!_instance) {
    _instance = new MiradorProxyManager();
  }
  return _instance;
};

export default getMiradorProxyManager;

Mirador.getMiradorProxyManager = getMiradorProxyManager; // to be called from Mirador core.
