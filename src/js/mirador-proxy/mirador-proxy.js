import getLogger from '../util/logger';
import WorkspaceProxy from './workspace-proxy';
import WindowProxy from './window-proxy';

const logger = getLogger();

export default class MiradorProxy {
  constructor(mirador, id) {
    this._mirador = mirador;
    this._workspaceProxy = null;
    this._id = id;
  }

  // Proxy ID. Mirador instance currently doesn't have an ID.
  getId() {
    return this._id;
  }

    // Lazy call because workspace is set up asynchronously.
  getWorkspaceProxy() {
    if (!this._workspaceProxy) {
      this._workspaceProxy = new WorkspaceProxy(this._mirador.viewer.workspace);
    }
    return this._workspaceProxy;
  }

  getWindowProxies() {
    return this.getWorkspaceProxy().getWindowProxies();
  }

  getWindowProxyById(windowId) {
    return new WindowProxy(this.getWindowById(windowId));
  }

  getWindowById(windowId) {
    logger.debug('MiradorProxy#getWindowById windowId:', windowId);
    return this.getWorkspaceProxy().getWindowById(windowId);
  }

  publish() {
    const eventEmitter = this._mirador.eventEmitter;
    let args = Array.from(arguments);
    eventEmitter.publish.apply(eventEmitter, args);
  }

  subscribe(eventName, handler) {
    logger.debug('MiradorProxy#subscribe', eventName, handler);
    this._mirador.eventEmitter.subscribe(eventName, handler);
  }

  unsubscribe(eventName, handler) {
    logger.debug('MiradorProxy#unsubscribe', eventName, handler);
    this._mirador.eventEmitter.unsubscribe(eventName, handler);
  }
}
