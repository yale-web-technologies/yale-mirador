import getLogger from '../util/logger';
import WindowProxy from './window-proxy';

export default class WorkspaceProxy {

  constructor(workspace) {
    this.logger = getLogger();
    this.workspace = workspace;
  }

  getWorkspace() {
    return this.workspace;
  }

  getWindowProxies() {
    return this.workspace.windows.map(window => new WindowProxy(window));
  }

  getWindowById(windowId) {
    const _this = this;
    const windows = this.workspace.windows.filter(window => {
      _this.logger.debug('WorkspaceProxy#getWindowById current window:', window);
      return window.id === windowId;
    });
    var numWindows = windows.length;
    if (numWindows > 1) {
      this.logger.error('MiradorProxy#getWindowById: more than one (' + numWindows + ') found for id: ' + windowId);
    }
    return numWindows > 0 ? windows[0] : null;
  }
}
