import getLogger from './util/logger';
import getMiradorProxyManager from './mirador-proxy/mirador-proxy-manager';
import AnnotationListRenderer from './widgets/annotation-window/annotation-list-renderer';
import AnnotationWindow from './widgets/annotation-window/annotation-window';

const logger = getLogger();

export default class {
  constructor(rootElementId) {
    this.init(rootElementId);
  }

  init(rootElementId) {
    logger.debug('Grid#init');
    this.element = jQuery('#' + rootElementId);
    this.miradorProxyManager = getMiradorProxyManager();

    this._annotationWindows = {};

    this.initLayout();
    this.bindEvents();
  }

  // GoldenLayout
  initLayout() {
    logger.debug('Grid#initLayout');
    const _this = this;
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
      const id = componentState.miradorId;
      const template = Handlebars.compile(jQuery('#viewer_template').html());
      container.getElement().html(template({ id: id }));
    });

    this._layout.registerComponent('Annotations', (container, componentState) => {
      const id = componentState.windowId;
      const annotationWindowElem = jQuery('<div/>').attr('id', id)[0];
      container.getElement().html(annotationWindowElem.outerHTML);
    });

    this._layout.on('stateChanged', e => {
      logger.debug('GoldenLayout stateChanged event:', e);
      for (let miradorProxy of _this.miradorProxyManager.getMiradorProxies()) {
        miradorProxy.publish('resizeMirador');
      }
      return true;
    });

    this._layout.on('itemDestroyed', item => {
      logger.debug('GoldenLayout itemDestroyed item:', item);
      if (item.componentName == 'Annotations') {
        const windowId = item.config.componentState.windowId;
        logger.debug('Annotation window destroyed:', windowId);
        delete _this._annotationWindows[windowId];
        _this._resizeWindows();
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
    logger.debug('Grid#addMiradorWindow');
    const itemConfig = {
      type: 'component',
      componentName: 'Mirador',
      componentState: { miradorId: miradorId }
    };
    this._layout.root.contentItems[0].addChild(itemConfig);
  }

  addWindows(config) {
    logger.debug('Grid#addWindows config:', config);
    for (let windowConfig of config.windows) {
      windowConfig.miradorId = config.miradorId;
      windowConfig.canvasWindowId = config.canvasWindowId;
      this.addWindow(windowConfig);
    }
  }

  addWindow(options) {
    logger.debug('Grid#addWindow options:', options);
    const _this = this;
    const windowId = Mirador.genUUID(); // annotation window ID
    const canvasWindowId = options.canvasWindowId || null;
    const itemConfig = {
      id: windowId,
      type: 'component',
      componentName: 'Annotations',
      componentState: { windowId: windowId }
    };
    this._layout.root.contentItems[0].addChild(itemConfig);

    const windowProxy = this.miradorProxyManager.getWindowProxyById(options.canvasWindowId);
    const annoExplorer = windowProxy.getEndPoint().getAnnotationExplorer();
    const annoListRenderer = new AnnotationListRenderer({
      canvasWindowId: canvasWindowId
    });
    const annoWin = new AnnotationWindow({ appendTo: jQuery('#' + windowId),
      annotationListRenderer: annoListRenderer,
      explorer: annoExplorer,
      miradorId: options.miradorId || null,
      canvasWindowId: canvasWindowId,
      initialLayerId: options.layerId || null,
      initialTocTags: options.tocTags || null,
      annotationId: options.annotationId || null
    });
    return annoWin.init().then(window => {
      _this._annotationWindows[windowId] = annoWin;
      _this._resizeWindows();
      return window;
    })
    .catch(reason => { throw reason; });
  }

  bindEvents() {
    logger.debug('Grid#bindEvents');
    const _this = this;

    jQuery.subscribe('YM_ADD_WINDOW', function(event, options) {
      _this.addWindow(options || {});
    });

    jQuery.subscribe('YM_ADD_WINDOWS', function(event, config) {
      logger.debug('Received YM_ADD_WINDOWS config:', config);
      _this.addWindows(config);
    });
  }

  showAnnotation(miradorId, windowId, annoId) {
    logger.debug('Grid#showAnnotation miradorId: ' + miradorId +
      ', windowId: ' + windowId + ', annoId: ' + annoId);
    const miradorProxy = this.miradorProxyManager.getMiradorProxy(miradorId);
    const windowProxy = miradorProxy.getWindowProxyById(windowId);
    const annotations = windowProxy.getAnnotationsList();
    const annotation = annotations.filter(anno => anno['@id'] === annoId)[0];
    let found = false;

    for (let annoWindow of Object.values(this._annotationWindows)) {
      let success = annoWindow.scrollToAnnotation(annoId);
      if (success) {
        annoWindow.highlightAnnotation(annoId);
      }
      found = found || success;
    }
    if (!found) {
      if (annotation) {
        this.addWindow({
          miradorId: miradorId,
          canvasWindowId: windowId,
          layerId: annotation.layerId
        }).then(function(annoWindow) {
          annoWindow.scrollToAnnotation(annoId);
        }).catch(function(reason) {
          logger.error('Grid#showAnnotation addWindow failed <- ' + reason);
        });
      } else {
        logger.error('Grid#showAnnotation annotation not found from endpoint, id: ' + annoId);
      }
    }
  }

  _resizeWindows() {
    const windowIds = Object.keys(this._annotationWindows);
    const numAnnoWindows = windowIds.length;
    let width = 0;

    switch (numAnnoWindows) {
      case 1: width = 30; break;
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
}
