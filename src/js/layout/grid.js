import getApp from '../app';
import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import getModalAlert from '../widgets/modal-alert'
import getStateStore from '../state-store';
import AnnotationWindow from '../widgets/annotation-window/annotation-window';

const logger = getLogger();

export default class {
  constructor(rootElementId) {
    this.init(rootElementId);
  }

  init(rootElementId) {
    logger.debug('Grid#init');
    this.element = jQuery('#' + rootElementId);
    this._state = getStateStore();
    this.miradorProxyManager = getMiradorProxyManager();
    this._annotationExplorer = getApp().getAnnotationExplorer();
    this._annotationWindows = {};

    this.initLayout();
    this.bindEvents();
  }

  // GoldenLayout
  initLayout() {
    logger.debug('Grid#initLayout');
    const config = {
      settings: {
        hasHeaders: true,
        showPopoutIcon: false,
        selectionEnabled: false
      },
      dimensions: {
        minItemWidth: 200,
        minItemHeight: 200
      },
      content: [{
        type: 'row',
        isClosable: false,
        content: [/*{
          type: 'component',
          componentName: 'Mirador',
          componentState: { label: 'Mirador' },
          isClosable: false
        }*/]
      }]
    };

    this._layout = new GoldenLayout(config, this.element);

    this._layout.registerComponent('Mirador', (container, componentState) => {
      logger.debug('Registering component container:', container, 'componentState:', componentState);
      const miradorElem = jQuery('<div/>').attr('id', componentState.miradorId)
      container.getElement().append(miradorElem);
    });

    this._layout.registerComponent('Annotations', (container, componentState) => {
      const id = componentState.windowId;
      const annotationWindowElem = jQuery('<div/>').attr('id', id)[0];
      container.getElement().html(annotationWindowElem.outerHTML);
    });

    this._layout.on('stateChanged', e => {
      logger.debug('GoldenLayout stateChanged event:', e);
      for (let miradorProxy of this.miradorProxyManager.getMiradorProxies()) {
        miradorProxy.publish('resizeMirador');
      }
      return true;
    });

    this._layout.on('itemDestroyed', item => {
      logger.debug('GoldenLayout itemDestroyed item:', item);
      if (item.componentName == 'Annotations') {
        const windowId = item.config.componentState.windowId;
        logger.debug('Annotation window destroyed:', windowId);
        this._annotationWindows[windowId].destroy();
        delete this._annotationWindows[windowId];
        this._resizeWindows();
      }
    });

    this._layout.init();
  }

  resize() {
    logger.debug('Grid#resize');
    this.element.css('bottom', 0);
    this._layout.updateSize();
  }

  addMiradorWindow(miradorId) {
    logger.debug('Grid#addMiradorWindow miradorId:', miradorId);
    const itemConfig = {
      type: 'component',
      componentName: 'Mirador',
      componentState: { miradorId: miradorId },
      isClosable: false
    };
    this._layout.root.contentItems[0].addChild(itemConfig);
  }

  addAnnotationWindows(config) {
    logger.debug('Grid#addAnnotationWindows config:', config);
    for (let windowConfig of config.windows) {
      this.addAnnotationWindow(windowConfig);
    }
  }

  async addAnnotationWindow(options) {
    logger.debug('Grid#addAnnotationWindow options:', options);
    await getModalAlert().show('Opening an annotation window...');

    const windowId = Mirador.genUUID(); // annotation window ID
    const imageWindowId = options.imageWindowId || null;
    const itemConfig = {
      id: windowId,
      type: 'component',
      componentName: 'Annotations',
      componentState: { windowId: windowId }
    };

    this._layout.root.contentItems[0].addChild(itemConfig);

    const annoExplorer = getApp().getAnnotationExplorer();

    // Just taking the first (highest-level) tag, for now
    const annoWin = new AnnotationWindow({
      id: windowId,
      appendTo: jQuery('#' + windowId),
      explorer: annoExplorer,
      miradorId: options.miradorId || null,
      canvasWindowId: imageWindowId,
      initialLayerId: options.layerId || this._pickLayer(),
      initialTocTags: options.tocTags || [],
      annotationId: options.annotationId || null,
      appState:this._state
    });

    await annoWin.init().catch(reason => {
      logger.error('Grid#addAnnotationWindow annoWin.init failed:', reason);
    });

    this._annotationWindows[windowId] = annoWin;
    this._resizeWindows();

    getModalAlert().hide();
    return annoWin;
  }

  getAnnotationWindows() {
    return this._annotationWindows;
  }

  getAnnotationWindowByLayer(layerId) {
    logger.debug('Grid#getAnnotationWindowByLayer layerId:', layerId, 'windows:', this._annotationWindows);
    for (let annoWindow of Object.values(this._annotationWindows)) {
      if (annoWindow.getCurrentLayerId() === layerId) {
        return annoWindow;
      }
    }
    return null;
  }

  bindEvents() {
    logger.debug('Grid#bindEvents');

    jQuery.subscribe('YM_ADD_WINDOW', (event, options) => {
      this.addAnnotationWindow(options || {});
    });

    jQuery.subscribe('YM_ADD_WINDOWS', (event, config) => {
      logger.debug('Received YM_ADD_WINDOWS config:', config);
      this.addAnnotationWindows(config);
    });
  }

  _resizeWindows() {
    const windowIds = Object.keys(this._annotationWindows);
    const numAnnoWindows = windowIds.length;
    let width = 0;

    switch (numAnnoWindows) {
      case 1: width = 20; break;
      case 2: width = 25; break;
      default: width = 100 / (numAnnoWindows + 1);
    }

    for (let windowId of windowIds) {
      this._setWidth(windowId, width);
    }
  }

  _setWidth(itemId, percentWidth) {
    logger.debug('Grid#_setWidth itemId:', itemId, 'width:', percentWidth);
    this._layout.root.getItemsById(itemId)[0].parent.config.width = percentWidth;
    this._layout.updateSize();
  }

  _pickLayer() {
    const allLayers = getStateStore().getTransient('annotationLayers');
    for (let candidateLayer of allLayers) {
      let candidateLayerId = candidateLayer['@id'];
      let useThisLayer = true;

      for (let annoWin of Object.values(this._annotationWindows)) {
        let usedLayerId = annoWin.getCurrentLayerId();
        if (candidateLayerId === usedLayerId) {
          useThisLayer = false;
          break;
        }
      }
      if (useThisLayer) {
        return candidateLayerId;
      }
    }
    return allLayers[0]['@id']; // return the first if every layer is already in use
  }
}
