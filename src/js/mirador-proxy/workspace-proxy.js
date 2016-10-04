import WindowProxy from './window-proxy';

export default class WorkspaceProxy {
  
  constructor(workspace) {
    this.workspace = workspace;
  }
  
  getWorkspace() {
    return this.workspace;
  }
  
  getWindowProxies() {
    return this.workspace.windows.map(window => new WindowProxy(window));
  }
  
  getWindowById(windowId) {
    var windows = jQuery.grep(this.workspace.windows, function(window) {
      return window.id === windowId;
    });
    var numWindows = windows.length;
    if (numWindows > 1) {
     console.log('Error MiradorProxy#getWindowById: more than one (' + numWindows + ') found for id: ' + windowId);
   }
    return numWindows == 1 ? windows[0] : null;
  }
}
