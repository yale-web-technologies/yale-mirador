import {Anno, annoUtil} from '../../import';
import AnnotationListWidget from './annotation-list-widget';
import fatalError from '../../util/fatal-error';
import getApp from '../../app';
import getLogger from '../../util/logger';
import getMiradorProxyManager from '../../mirador-proxy/mirador-proxy-manager';
import getStateStore from '../../state-store';
import MenuTagSelector from '../menu-tag-selector';
import LayerSelector from '../layer-selector';
import session from '../../session';
import WindowProxy from '../../mirador-proxy/window-proxy';

const logger = getLogger();

export default class AnnotationWindow {
  constructor(options) {
    this.options = Object.assign({
      id: null, // annotation window ID
      miradorId: null,
      canvasWindowId: null,
      appendTo: null,
      annotationListWidget: null,
      explorer: null,
      initialLayerId: null,
      initialTocTags: [],
      annotationId: null
    }, options);

    logger.debug('AnnotationWindow#constructor options:', options);
    this._tocSpec = getStateStore().getTransient('tocSpec');
    this._jQuerySubscribed = {};
    this._miradorSubscribed = {};
    this._annotationTocCache = getApp().getAnnotationTocCache();
  }

  getId() {
    return this.options.id;
  }

  /**
   * @returns {Promise}
   */
  async init() {
    const proxyMgr = getMiradorProxyManager();
    let annosToShow = [];
    let fullTagsTargets = null;
    let targetAnno = null;

    if (!this.options.id) {
      this.options.id = Mirador.genUUID();
    }
    this.miradorProxy = proxyMgr.getMiradorProxy(this.options.miradorId);
    this.canvasWindow = this.miradorProxy.getWindowProxyById(this.options.canvasWindowId);

    //const toc = this.options.explorer.getAnnotationToc();
    const canvasId = this.canvasWindow.getCurrentCanvasId();

    const toc = this._tocSpec ? await getApp().getAnnotationTocCache().getToc(canvasId) : null;

    this.element = jQuery(template({}));
    this.options.appendTo.append(this.element);
    this.listElem = this.element.find('.annowin_list');

    if (this.options.annotationId) { // annotation ID was given in the URL
      const matched = this.canvasWindow.getAnnotationsList().filter(anno => {
        if (!anno || typeof anno !== 'object') {
          logger.error('AnnotationWindow#init Invalid annotation', anno);
          return false;
        }
        return anno['@id'] === this.options.annotationId;
      });
      targetAnno = matched[0];
      if (matched.length > 0) {
        this.options.initialLayerId = targetAnno.layerId;
        if (toc) {
          this.options.initialTocTags = toc.getTagsFromAnnotationId(this.options.annotationId);
        }
      }
    }

    if (this.options.initialLayerId) { // layerIDs were given in the URL
      annosToShow = this.canvasWindow.getAnnotationsList();
      annosToShow = annosToShow.filter(anno => anno.layerId == this.options.initialLayerId);

      if (this.options.initialTocTags.length > 0) {
        if (toc) {
          annosToShow = annosToShow.filter(anno => toc.matchHierarchy(anno, this.options.initialTocTags.slice(0,1)));
          fullTagsTargets = annosToShow.filter(anno => toc.matchHierarchy(anno, this.options.initialTocTags));
          if (fullTagsTargets.length > 0 && !targetAnno) {
            targetAnno = fullTagsTargets[0];
          }
        }
      }
    }

    if (!targetAnno) {
      targetAnno = annosToShow[0];
    }
    logger.debug('AnnotationWindow#init targetAnno:', targetAnno);

    this.initLayerSelector();
    this.addCreateWindowButton();
    this.placeholder = this.element.find('.placeholder');
    this.placeholder.text('Loading...').show();

    this._setupAnnotationListWidget();

    return this.reload()
    .catch(reason => {
      throw 'AnnotationWindow#init reload failed - ' + reason;
    })
    .then(() => {
      logger.debug('AnnotationWindow#init annosToShow:', annosToShow);
      const listWidget = this.options.annotationListWidget;
      //if ((this.options.annotationId || this.options.initialTocTags) && annosToShow.length > 0) {
      if (this.options.annotationId) {
        listWidget.highlightAnnotations([targetAnno], 'SELECTED');
        listWidget.goToAnnotation(this.options.annotationId, canvasId);
      } else if (this.options.initialTocTags.length > 0) {
        //listWidget.goToPageByTags(this.options.initialTocTags);
      } else {
        listWidget.goToPage(0);
      }
      this.bindEvents();
      return this;
    })
    .catch(reason => {
      throw 'AnnotationWindow#init promise failed - ' + reason;
    });
  }

  getImageWindowId() {
    return this.options.canvasWindowId;
  }

  getImageWindowProxy() {
    const windowId = this.getImageWindowId();
    return getMiradorProxyManager().getWindowProxyById(windowId);
  }

  _setupAnnotationListWidget() {
    if (!this.options.annotationListWidget) {
      const windowProxy = getMiradorProxyManager().getWindowProxyById(this.options.canvasWindowId);
      const canvases = windowProxy.getManifest().getCanvases();

      this.options.annotationListWidget =  new AnnotationListWidget({
        annotationWindow: this,
        rootElem: this.listElem,
        canvases: canvases,
        tocTags: this.options.initialTocTags,
        annotationExplorer: this.options.explorer,
        state: getStateStore(),
        isEditor: session.isEditor()
      });
      this.options.annotationListWidget.reload(this.options.initialLayerId);
    }
  }

  destroy() {
    logger.debug('AnnotationWindow#destroy');
    //this._unsubscribeAll(); //XXXX
  }

  initMenuTagSelector() {
    logger.debug('AnnotationWindow#initMenuTagSelector');
    if (this.menuTagSelector) {
      this.menuTagSelector.destroy();
    }
    this.menuTagSelector = new MenuTagSelector({
      parent: this.element.find('.menu_tag_selector_container'),
      tocSpec: getStateStore().getTransient('tocSpec'),
      annotationExplorer: this.options.explorer,
      initialTags: this.options.initialTocTags,
      changeCallback: async (value, text) => {
        logger.debug('Change from TOC selector: ', value);
        await this.options.annotationListWidget.goToPageByTags([value]);
        //this.updateList();
      }
    });
  }

  initLayerSelector() {
    this._setCurrentLayerId(this.options.initialLayerId);
    this.layerSelector = new LayerSelector({
      parent: this.element.find('.layer_selector_container'),
      annotationExplorer: this.options.explorer,
      initialLayerId: this.options.initialLayerId,
      changeCallback: (value, text) => {
        logger.debug('Change from Layer selector: ', value);
        this._setCurrentLayerId(value);
        this.updateList();
      }
    });
  }

  addCreateWindowButton() {
    const parent = this.element.find('.annowin_layer_row');
    const button = jQuery('<div/>')
      .addClass('ym_create_window_button')
      .append(jQuery('<i class="fa fa-plus fa-lg fa-fw"></i>'));
    parent.append(button);
    button.click(event => {
      this.miradorProxy.publish('YM_DISPLAY_ON');
      jQuery.publish('YM_ADD_WINDOW', {
        miradorId: this.options.miradorId,
        imageWindowId: this.options.canvasWindowId
      });
    });
  }

  getCurrentLayerId() {
    return this._currentLayerId;
  }

  _setCurrentLayerId(layerId) {
    logger.debug('AnnotationWindow#_setCurrentLayerId layerId:', layerId);
    this._currentLayerId = layerId;
  }

  reload() {
    logger.debug('AnnotationWindow#reload');
    const _this = this;
    const state = getStateStore();

    this.placeholder.hide();

    if (state.getBoolean('fixAnnoCellHeight')) {
      this.element.addClass('fixed_height_cells');
    } else {
      this.element.removeClass('fixed_height_cells');
    }

    var canvas = this.getCurrentCanvas();
    this.element.find('.title').text(canvas.label);

    /* We're not showing toc selector in annotation window. Annotation ToC is now in sidebar menu
    if (state.getTransient('tagHierarchy')) {
      this.initMenuTagSelector();
      this.element.find('.annowin_menu_tag_row').show();
    } else {
      this.element.find('.annowin_menu_tag_row').hide();
    }
    */

    const layersPromise = new Promise(function(resolve, reject) {
      _this.options.explorer.getLayers().then(function(layers) {
        if (layers.length > 0) {
          if (_this.layerSelector.isLoaded()) {
            resolve();
          } else {
            _this.layerSelector.init(layers).then(function(layerSelector) {
              _this._setCurrentLayerId(layerSelector.val());
              resolve();
            }).catch(function(reason) {
              reject('layerSelector.init failed - ' + reason);
            });
          }
        } else {
          reject('No layers from annotation explorer');
        }
      });
    });

    const tocPromise = new Promise(function(resolve, reject) {
      if (_this.options.explorer.getAnnotationToc()) {
        _this.menuTagSelector.reload().then(function() {
          resolve();
        }).catch(function(reason) {
          reject('menuTagSelector.reload failed - ' + reason);
        });
      } else {
        resolve();
      }
    });

    return Promise.all([layersPromise, tocPromise]).then(async () => {
      await this.updateList().catch(reason => {
        throw 'AnnotationWindow#updateList failed: ' + reason;
      });
      return this;
    });
  }

  async updateList() {
    const listWidget = this.options.annotationListWidget;
    const state = getStateStore();
    const canvasId = this.canvasWindow.getCurrentCanvasId();
    logger.debug('AnnotationWindow#updateList canvasId:', canvasId);
    /*
    if (this.options.explorer.getAnnotationToc()) {
      options.selectedTags = this.menuTagSelector.val().split('|');
    }
    */

    await listWidget.reload(this.layerSelector.val());
    let count = 0;

    if (this.options.initialTocTags.length > 0) {
      count = await listWidget.goToPageByTags(this.options.initialTocTags).catch(reason => {
        throw 'listWidget#goToPageByTags failed: ' + reason + '(tags: ' + this.options.initialTocTags + ')';
      });
      if (this.options.annotationId) {
        listWidget.scrollToAnnotation(this.options.annotationId);
      }
    } else {
      count = await listWidget.goToPageByCanvas(canvasId).catch(reason => {
        throw 'listWidget#goToPageByCanvas failed: ' + reason;
      });
    }

    if (count === 0) {
      this.placeholder.text('No annotations found.').show();
    } else {
      this.placeholder.hide();
    }
  }

  getCurrentCanvasId() {
    return this.canvasWindow.getCurrentCanvasId();
  }

  getCurrentCanvas() {
    const id = this.getCurrentCanvasId();
    const canvases = this.canvasWindow.getManifest().getCanvases();
    const current = canvases.filter(canvas => {
      return canvas['@id'] === id;
    });

    if (current.length < 1) {
      fatalError('Could not find the requested canvas: ' + id);
    } else {
      return current[0];
    }
  }

  scrollToAnnotation(annoId) {
    this.options.annotationListWidget.scrollToAnnotation(annoId);
  }

  async goToAnnotation(annoId, canvasId) {
    logger.debug('AnnotationWindow#goToAnnotation annoId:', annoId, 'canvasId:', canvasId);

    return this.options.annotationListWidget.goToAnnotation(annoId, canvasId);
  }

  createInfoDiv(annotation, callback) {
    var targetAnnoID = annotation.on.full;
    var targetLink = '<a target="_blank" href="' + targetAnnoID + '">' + targetAnnoID + '</a>';
    return jQuery(infoTemplate({ on: targetLink }));
  }

  hasOpenEditor() {
    var hasOne = false;
    this.listElem.find('.annowin_anno').each(function(index, value) {
      if (jQuery(value).data('editing') === true) {
        hasOne = true;
        return false; // breaking out of jQuery.each
      };
    });
    return hasOne;
  }

  fadeUp(elem, onComplete) {
    elem.transition({
      animation: 'fade up',
      duration: '0.3s',
      onComplete: onComplete
    });
  }

  fadeDown(elem, onComplete) {
    elem.transition({
      animation: 'fade down',
      duration: '0.3s',
      onComplete: onComplete
    });
  }

  clearAnnotationHighlights() {
    this.options.annotationListWidget.clearAnnotationHighlights();
  }

  highlightAnnotationElem(annoElem, flag) {
    this.options.annotationListWidget.highlightAnnotationElem(annoElem, flag);
  }

  bindEvents() {
    logger.debug('AnnotationWindow#bindEvents');

    this._subscribe(jQuery, 'ANNOWIN_ANNOTATION_FOCUSED', async (event, params) => {
      logger.debug('Annotation window ' + this.options.id + ' received ANNOWIN_ANNOTATION_FOCUSED params:', params, 'layer:', this.getCurrentLayerId());
      const $anno = Anno(params.annotation);
      const listWidget = this.options.annotationListWidget;

      if (params.annotationWindowId === this.options.id) {
        // Only want to listen to evnets generated by another annotation window
        return;
      }
      listWidget.clearHighlights();

      const annotations = this.canvasWindow.getAnnotationsList();
      const layerId = this.getCurrentLayerId();
      const tocSpec = getStateStore().getTransient('tocSpec');

      if (tocSpec) {
        const toc = await getApp().getAnnotationTocCache().getToc(params.canvasId);
        const siblingElems = listWidget.getTocSiblingElems(params.annotation, annotations, layerId, toc);

        listWidget.clearHighlights();
        for (let elem of siblingElems) {
          listWidget.highlightAnnotationElem(elem);
        }

        if (siblingElems.length > 0) {
          await listWidget.goToPageByCanvas(params.canvasId);
          listWidget.scrollToElem(siblingElems[0], -params.offset);
        }
        return;
      }

      await listWidget.goToPageByCanvas(params.canvasId);

      const annoMap = {};
      for (let anno of annotations) {
        annoMap[anno['@id']] = anno;
      }
      let targeting = annoUtil.findTransitiveTargetingAnnotations(
        params.annotation, annoMap);
      targeting = targeting.filter(anno => anno.layerId === this.getCurrentLayerId());

      if (targeting.length > 0) {
        listWidget.highlightAnnotations(targeting, 'TARGETING');
        return;
      }

      const targeted = annoUtil.findTransitiveTargetAnnotations(
        params.annotation, annoMap)
        .filter(anno => anno.layerId === this.getCurrentLayerId());

      if (targeted.length > 0) {
        listWidget.highlightAnnotations(targeted, 'TARGET');
        return;
      }
    });

    this._subscribe(jQuery, 'YM_ANNO_HEIGHT_FIXED', (event, fixedHeight) => {
      if (fixedHeight) {
        this.element.addClass('fixed_height_cells');
      } else {
        this.element.removeClass('fixed_height_cells');
      }
    });

    this._subscribe(jQuery, 'YM_ANNOTATION_TOC_TAGS_SELECTED', (evnet, windowId, canvasId, tags) => {
      logger.debug('AnnotationWindow:SUB:YM_ANNOTATION_TOC_TAGS_SELECTED imageWindow:', windowId, 'canvasId:', canvasId, 'tags:', tags);
      this.options.annotationListWidget.goToPageByTags(tags);
    });

    this._subscribe(this.miradorProxy, 'YM_IMAGE_WINDOW_TOOLTIP_ANNO_CLICKED', async (event, windowId, annoId) => {
      logger.debug('AnnotationWindow:SUB:YM_IMAGE_WINDOW_TOOLTIP_ANNO_CLICKED windowId:', windowId, 'annoId:', annoId, 'annoWin:', this.id);
      const windowProxy = this.miradorProxy.getWindowProxyById(windowId);
      const canvasId = windowProxy.getCurrentCanvasId();
      const toc = await this._annotationTocCache.getToc(canvasId);
      const annotation = toc.annotations.filter(anno => anno['@id'] === annoId)[0];

      if (annotation) {
        this.options.annotationListWidget.goToPageByTags(annotation.tocTags);
      }
    });
  }

  _subscribe(context, eventId, handler) {
    let saved;

    if (context === jQuery) {
      saved = this._jQuerySubscribed;
    } else if (context === this.miradorProxy) {
      saved = this._miradorSubscribed;
    } else {
      const msg = 'AnnotationWindow#_subscribe invalid context ';
      logger.error(msg, context);
      throw msg + context;
    }
    if (!(saved[eventId] instanceof Array)) {
      saved[eventId] = [];
    }
    saved[eventId].push(handler);
    context.subscribe(eventId, handler);
  }

  _unsubscribeAll() {
    for (let context of [jQuery, this.miradorProxy]) {
      let saved = context === jQuery ? this._jQuerySubscribed : this._miradorSubscribed;

      for (let [eventId, handlers] of Object.entries(saved)) {
        for (let handler of handlers) {
          context.unsubscribe(eventId, handler);
        }
      }
    }
  }
}

const template = Handlebars.compile([
  '<div class="ym_annotation_window">',
  '  <div class="annowin_header">',
  '    <div class="annowin_layer_row">',
  '      <span class="layer_selector_container"></span>',
  '    </div>',
  '    <div class="annowin_menu_tag_row">',
  '      <span class="menu_tag_selector_container"></span>',
  '    </div>',
  '  </div>',
  '  <div class="placeholder"></div>',
  '  <div class="annowin_list" tabindex="-1">',
  '  </div>',
  '</div>'
].join(''));
