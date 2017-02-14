import getLogger from '../util/logger';
import WorkspaceProxy from './workspace-proxy';
import WindowProxy from './window-proxy';

export default class MiradorProxy {
  constructor(mirador) {
    this.logger = getLogger();
    this.mirador = mirador;
    this.workspaceProxy = null;
  }

  getId() {
    return this.mirador.id;
  }

    // Lazy call because workspace is set up asynchronously.
  getWorkspaceProxy() {
    if (!this.workspaceProxy) {
      this.workspaceProxy = new WorkspaceProxy(this.mirador.viewer.workspace);
    }
    return this.workspaceProxy;
  }

  getWindowProxies() {
    return this.getWorkspaceProxy().getWindowProxies();
  }

  getWindowProxyById(windowId) {
    return new WindowProxy(this.getWindowById(windowId));
  }

  getWindowById(windowId) {
    this.logger.debug('MiradorProxy#getWindowById windowId:', windowId);
    return this.getWorkspaceProxy().getWindowById(windowId);
  }

  publish() {
    const eventEmitter = this.mirador.eventEmitter;
    let args = Array.from(arguments);
    eventEmitter.publish.apply(eventEmitter, args);
  }

  subscribe(eventName, callback) {
    this.logger.debug('MiradorProxy#subscribe', eventName, callback);
    this.mirador.eventEmitter.subscribe(eventName, callback);
  }

  unsubscribe(eventName) {
    this.mirador.eventEmitter.unsubscribe(eventName);
  }
}
