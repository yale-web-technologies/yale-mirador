import WorkspaceProxy from './workspace-proxy';
import WindowProxy from './window-proxy';

export default class MiradorProxy {
  constructor(mirador) {
    this.mirador = mirador;
    this.workspaceProxy = null;
  }
  
  /*
  getState() {
    return this.mirador.viewer.state;
  }*/
  
  // Lazy call because workspace is set up asynchronously.
  getWorkspaceProxy() {
    if (!this.workspaceProxy) {
      this.workspaceProxy = new WorkspaceProxy(this.mirador.viewer.workspace);
    }
    return this.workspaceProxy;
  }
  
  getWindowById(windowId) {
    return this.getWorkspaceProxy().getWindowById(windowId);
  }
  
  getFirstWindow() {
    return this.getWorkspaceProxy().getWorkspace().windows[0];
  }
  
  getFirstWindowProxy() {
    return new WindowProxy(this.getFirstWindow());
  }
  
  publish() {
    const eventEmitter = this.mirador.viewer.eventEmitter;
    let args = Array.from(arguments);
    eventEmitter.publish.apply(eventEmitter, args);
  }
  
  subscribe(eventName, callback) {
    this.mirador.viewer.eventEmitter.subscribe(eventName, callback);
  }
  
  unsubscribe(eventName) {
    this.mirador.viewer.eventEmitter.unsubscribe(eventName);
  }
}