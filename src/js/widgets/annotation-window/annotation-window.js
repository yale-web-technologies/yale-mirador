import {Anno, annoUtil} from '../../import';
import AnnotationListWidget from './annotation-list-widget';
import domHelper from './dom-helper';
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
    logger.debug('AnnotationWindow#constructor options:', options);
    this._id = options.id; // annotation window ID
    this._miradorId = options.miradorId;
    this._imageWindowId = options.canvasWindowId;
    this._appendTo = options.appendTo;
    this._listWidget = options.annotationListWidget;
    this._explorer = options.explorer;
    this._initialLayerId = options.initialLayerId || null;
    this._initialTocTags = options.initialTocTags || [];
    this._annotationId = options.annotationId;
    this._state = options.appState;

    this._miradorProxy = getMiradorProxyManager().getMiradorProxy(this._miradorId);
    this._tocSpec = getStateStore().getTransient('tocSpec');
    this._annotationTocCache = getApp().getAnnotationTocCache();

    if (!this._id) { this._id = Mirador.genUUID(); }
    this._imageWindow = this._miradorProxy.getWindowProxyById(this._imageWindowId);

    this._rootElem = jQuery(template({}));
    this._appendTo.append(this._rootElem);
    this._listElem = domHelper.findAnnoListElem(this._rootElem);

    this._continuousPages =  this._state.getTransient('continuousPages');

    this._jQuerySubscribed = {};
    this._miradorSubscribed = {};
    this._setDirty(false);

    this._flexDirection = 'column';
    this._ignoredEvents = {};
  }

  getId() {
    return this._id;
  }

  /**
   * Initializations that require async operations
   *
   * @returns {Promise}
   */
  async init() {
    const canvasId = this._imageWindow.getCurrentCanvasId();
    const annotationList = this._imageWindow.getAnnotationsList();
    const toc = this._tocSpec ? await getApp().getAnnotationTocCache().getToc(canvasId) : null;

    let { targetAnno, layerId, tocTags } = this._processDataParams({
      annotationId: this._annotationId,
      annotationList: annotationList,
      layerId: this._initialLayerId,
      toc: toc,
      tocTags: this._initialTocTags
    });

    logger.debug('AnnotationWindow#init targetAnno:', targetAnno);

    this.initLayerSelector();
    this.addToggleDirectionButton();
    this.addCreateWindowButton();
    this.placeholder = this._rootElem.find('.placeholder');
    this.placeholder.text('Loading...').show();
    this._setupAnnotationListWidget();

    await this.reload().catch(reason => {
      throw 'AnnotationWindow#init reload failed - ' + reason;
    });

    if (this._annotationId) {
      this._listWidget.highlightAnnotations([targetAnno], 'SELECTED');
      this._listWidget.goToAnnotation(this._annotationId, canvasId);
    } else if (this._initialTocTags.length > 0) {
      this._listWidget.goToPageByTags(tocTags);
    } else {
      this._listWidget.goToPageByCanvas(canvasId);
    }
    this.bindEvents();
    return this;
  }

  ignoreEvent(eventId, duration) {
    this._ignoredEvents[eventId] =  new Date().valueOf() + duration;
  }

  _shouldIgnoreEvent(eventId) {
    const expiration = this._ignoredEvents[eventId];
    if (typeof expiration === 'number') {
      if (new Date().valueOf() < expiration) {
        return true;
      } else {
        delete this._ignoredEvents[eventId];
      }
    }
    return false;
  }

  /**
   * Process initialization parameters concerning which data to display how.
   * params: {
   *   annotationId: string,
   *   annotationList: Array.<object>,
   *   layerId: string,
   *   toc: jossugi.AnnotationToc,
   *   tocTags: Array.<string>
   * }
   * @param {object} params
   * @return {{targetAnno: object, layerId: string, tocTags: string[]}}
   */
  _processDataParams(params) {
    logger.debug('AnnotationWindow#_processDataParams params:', params);
    let targetAnno = null; // annotation that should be visible and focused on
    let layerId = params.layerId;
    let tocTags = params.tocTags;

    if (params.annotationId) { // annotationId is given the highest priority in determining targetAnno
      targetAnno = annoUtil.findAnnotationFromListById(params.annotationId,
        params.annotationList);

      if (targetAnno) {
        layerId = targetAnno.layerId;
        if (params.toc) {
          tocTags = params.toc.getTagsFromAnnotationId(params.annotationId);
        }
      }
    }
    return {targetAnno: targetAnno, layerId: layerId, tocTags: tocTags};
  }

  _getTargetAnnoWithToc(annotationList, layerId, toc, tocTags) {
    const annosToShow = annotationList.filter(anno => anno.layerId == layerId)
      .filter(anno => toc.matchHierarchy(anno, tocTags.slice(0,1)));
    const fullTagsTargets = annosToShow.filter(anno => toc.matchHierarchy(anno, tocTags));

    if (fullTagsTargets.length > 0 && !targetAnno) {
      targetAnno = fullTagsTargets[0];
    }
  }

  /**
   * Process init option "annotationId"
   * @param {{annotationId: string, annotationList: Array.<object>, layerId: string, toc: object}} params
   * @return {{targetAnno: object, layerId: string, tocTags: string[]}}
   */
  _processAnnotationId(params) {
    const targetAnno = annoUtil.findAnnotationFromListById(params.annotationId,
      params.annotationList)[0];
    let layerId = params.layerId;
    let tocTags = [];

    if (targetAnno) {
      layerId = targetAnno.layerId;
      if (params.toc) {
        tocTags = toc.getTagsFromAnnotationId(params.annotationId);
      }
    }
    return {targetAnno: targetAnno, layerId: layerId, tocTags: tocTags};
  }

  _processLayerId(layerId, annotationList, toc, tocTags) {
    let annosToShow = annotationList.filter(anno => anno.layerId == this._initialLayerId);

    if (toc && tocTags.length > 0) {
      annosToShow = annosToShow.filter(anno => toc.matchHierarchy(anno, tocTags.slice(0,1)));
      const fullTagsTargets = annosToShow.filter(anno => toc.matchHierarchy(anno, tocTags));
      if (fullTagsTargets.length > 0 && !targetAnno) {
        targetAnno = fullTagsTargets[0];
      }
    }
  }

  getMiradorProxy() {
    return this._miradorProxy;
  }

  getImageWindowId() {
    return this._imageWindowId;
  }

  getImageWindowProxy() {
    const windowId = this.getImageWindowId();
    return getMiradorProxyManager().getWindowProxyById(windowId);
  }

  _setupAnnotationListWidget() {
    if (!this._listWidget) {
      const windowProxy = getMiradorProxyManager().getWindowProxyById(this._imageWindowId);
      const canvases = windowProxy.getManifest().getCanvases();

      this._listWidget =  new AnnotationListWidget({
        annotationWindow: this,
        rootElem: this._listElem,
        canvases: canvases,
        tocTags: this._initialTocTags,
        annotationExplorer: this._explorer,
        state: getStateStore(),
        isEditor: session.isEditor(),
        constinousPages: this._continuousPages
      });
      this._listWidget.reload(this._initialLayerId);
    }
  }

  destroy() {
    logger.debug('AnnotationWindow#destroy');
    this._unsubscribeAll(); //XXXX
  }

  getAnnoListNav() {
    return this._listWidget.getNav();
  }

  initMenuTagSelector() {
    logger.debug('AnnotationWindow#initMenuTagSelector');
    if (this.menuTagSelector) {
      this.menuTagSelector.destroy();
    }
    this.menuTagSelector = new MenuTagSelector({
      parent: this._rootElem.find('.menu_tag_selector_container'),
      tocSpec: getStateStore().getTransient('tocSpec'),
      annotationExplorer: this._explorer,
      initialTags: this._initialTocTags,
      changeCallback: async (value, text) => {
        logger.debug('Change from TOC selector: ', value);
        await this._listWidget.goToPageByTags([value]);
        //this.updateList();
      }
    });
  }

  initLayerSelector() {
    this._setCurrentLayerId(this._initialLayerId);
    this.layerSelector = new LayerSelector({
      parent: this._rootElem.find('.layer_selector_container'),
      annotationExplorer: this._explorer,
      initialLayerId: this._initialLayerId,
      changeCallback: (value, text) => {
        logger.debug('Change from Layer selector: ', value);
        this._setCurrentLayerId(value);
        this.updateList();
      }
    });
  }

  addToggleDirectionButton() {
    const parent = this._rootElem.find('.annowin_layer_row .right');
    const button = jQuery('<div/>')
      .addClass('ym_toggle_direction_button')
      .append(jQuery('<i class="fa fa-arrows-h fa-lg fa-fw"></i>'))
      .append(jQuery('<i class="fa fa-arrows-v fa-lg fa-fw"></i>'));
    parent.append(button);
    button.find('.fa-arrows-v').hide();
    button.click(event => {
      this._toggleFlexDirection();
    });
  }

  _processDirection() {
    if (this._rootElem.hasClass('row-reverse')) {
      this._rootElem.find('.fa-arrows-h').hide();
      this._rootElem.find('.fa-arrows-v').show();
      this._rootElem.find('.order-down').attr('class', 'order-down caret left icon');
      this._rootElem.find('.order-up').attr('class', 'order-up caret right icon');
    } else {
      this._rootElem.find('.fa-arrows-h').show();
      this._rootElem.find('.fa-arrows-v').hide();
      this._rootElem.find('.order-down').attr('class', 'order-down caret down icon');
      this._rootElem.find('.order-up').attr('class', 'order-up caret up icon');
    }
  }

  _toggleFlexDirection() {
    if (this._rootElem.hasClass('row-reverse')) {
      this._rootElem.toggleClass('row-reverse', false);
      this._rootElem.find('.fa-arrows-h').show();
      this._rootElem.find('.fa-arrows-v').hide();
      this._rootElem.find('.order-down').attr('class', 'order-down caret down icon');
      this._rootElem.find('.order-up').attr('class', 'order-up caret up icon');
    } else {
      this._rootElem.toggleClass('row-reverse', true);
      this._rootElem.find('.fa-arrows-h').hide();
      this._rootElem.find('.fa-arrows-v').show();
      this._rootElem.find('.order-down').attr('class', 'order-down caret left icon');
      this._rootElem.find('.order-up').attr('class', 'order-up caret right icon');
    }
  }

  addCreateWindowButton() {
    const parent = this._rootElem.find('.annowin_layer_row .right');
    const button = jQuery('<div/>')
      .addClass('ym_create_window_button')
      .append(jQuery('<i class="fa fa-plus fa-lg fa-fw"></i>'));
    parent.append(button);
    button.click(event => {
      this._miradorProxy.publish('YM_DISPLAY_ON');
      jQuery.publish('YM_ADD_WINDOW', {
        miradorId: this._miradorId,
        imageWindowId: this._imageWindowId
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

  show() {
    this._rootElem.show();
  }

  hide() {
    this._rootElem.hide();
  }

  _isDirty() {
    return this._dirty;
  }

  /**
   * @param {boolean} value
   */
  _setDirty(value) {
    this._dirty = value;
  }

  reload() {
    logger.debug('AnnotationWindow#reload');
    this.hide();
    const _this = this;
    const state = getStateStore();

    this.placeholder.hide();

    const canvas = this.getCurrentCanvas();
    this._rootElem.find('.title').text(canvas.label);

    /* We're not showing toc selector in annotation window. Annotation ToC is now in sidebar menu
    if (state.getTransient('tagHierarchy')) {
      this.initMenuTagSelector();
      this._rootElem.find('.annowin_menu_tag_row').show();
    } else {
      this._rootElem.find('.annowin_menu_tag_row').hide();
    }
    */

    const layersPromise = new Promise(function(resolve, reject) {
      _this._explorer.getLayers().then(function(layers) {
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
      if (_this._explorer.getAnnotationToc()) {
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
      this._processDirection();
      this.show();
      return this;
    });
  }

  reloadIfDirty() {
    logger.debug('AnnotationWindow#reloadIfDirty dirty:', this._dirty);
    if (this._isDirty()) {
      this._setDirty(false);
      this.reload();
    }
  }

  async updateList() {
    const listWidget = this._listWidget;
    const state = getStateStore();
    const canvasId = this._imageWindow.getCurrentCanvasId();
    logger.debug('AnnotationWindow#updateList canvasId:', canvasId);
    /*
    if (this._explorer.getAnnotationToc()) {
      options.selectedTags = this.menuTagSelector.val().split('|');
    }
    */

    await listWidget.reload(this.layerSelector.val());
    let count = 0;

    if (this._initialTocTags.length > 0) {
      count = await listWidget.goToPageByTags(this._initialTocTags).catch(reason => {
        throw 'listWidget#goToPageByTags failed: ' + reason + '(tags: ' + this._initialTocTags + ')';
      });
      if (this._annotationId) {
        listWidget.scrollToAnnotation(this._annotationId);
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
    return this._imageWindow.getCurrentCanvasId();
  }

  getCurrentCanvas() {
    const id = this.getCurrentCanvasId();
    const canvases = this._imageWindow.getManifest().getCanvases();
    const current = canvases.filter(canvas => {
      return canvas['@id'] === id;
    });

    if (current.length < 1) {
      fatalError('Could not find the requested canvas: ' + id);
    } else {
      return current[0];
    }
  }

  select(annoElem) {
    this._listWidget.select(annoElem);
  }

  scrollToAnnotation(annoId) {
    this._listWidget.scrollToAnnotation(annoId);
  }

  async goToAnnotation(annoId, canvasId) {
    logger.debug('AnnotationWindow#goToAnnotation annoId:', annoId, 'canvasId:', canvasId);

    return this._listWidget.goToAnnotation(annoId, canvasId);
  }

  createInfoDiv(annotation, callback) {
    var targetAnnoID = annotation.on.full;
    var targetLink = '<a target="_blank" href="' + targetAnnoID + '">' + targetAnnoID + '</a>';
    return jQuery(infoTemplate({ on: targetLink }));
  }

  hasOpenEditor() {
    var hasOne = false;
    this._listElem.find('.annowin_anno').each(function(index, value) {
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
    this._listWidget.clearAnnotationHighlights();
  }

  highlightAnnotationElem(annoElem, flag) {
    this._listWidget.highlightAnnotationElem(annoElem, flag);
  }

  bindEvents() {
    logger.debug('AnnotationWindow#bindEvents');

    this._subscribe(this._miradorProxy, 'ANNOTATIONS_LIST_UPDATED', (event, params) => {
      logger.debug('AnnotationWindow:SUB:ANNOTATIONS_LIST_UPDATED, params:', params);
      if (params.windowId === this.getImageWindowId() && !this._shouldIgnoreEvent('ANNOTATIONS_LIST_UPDATED')) {
        if (this.hasOpenEditor()) {
          this._setDirty(true);
        } else {
          this.reload();
        }
      }
    });

    this._subscribe(jQuery, 'ANNOWIN_ANNOTATION_FOCUSED', async (event, params) => {
      logger.debug('AnnotationWindow:SUB:ANNOWIN_ANNOTATION_FOCUSED annotation window id:', this._id,  'params:', params, 'layer:', this.getCurrentLayerId());
      const $anno = Anno(params.annotation);
      const listWidget = this._listWidget;
      let targetElem = null;

      if (params.annotationWindowId === this._id) {
        // Only want to listen to evnets generated by another annotation window
        return;
      }
      listWidget.clearHighlights();

      const annotations = this._imageWindow.getAnnotationsList();
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
        targetElem = domHelper.findAnnoElemByAnnoId(targeting[0]['@id'], this._listElem);
        listWidget.scrollToElem(targetElem, -params.offset);
        return;
      }

      const targeted = annoUtil.findTransitiveTargetAnnotations(
        params.annotation, annoMap)
        .filter(anno => anno.layerId === this.getCurrentLayerId());

      if (targeted.length > 0) {
        listWidget.highlightAnnotations(targeted, 'TARGET');
        targetElem = domHelper.findAnnoElemByAnnoId(targeted[0]['@id'], this._listElem);
        listWidget.scrollToElem(targetElem, -params.offset);
        return;
      }
    });

    this._subscribe(jQuery, 'YM_ANNOTATION_TOC_TAGS_SELECTED', (evnet, windowId, canvasId, tags) => {
      logger.debug('AnnotationWindow:SUB:YM_ANNOTATION_TOC_TAGS_SELECTED imageWindow:', windowId, 'canvasId:', canvasId, 'tags:', tags);
      this._listWidget.goToPageByTags(tags);
    });

    this._subscribe(this._miradorProxy, 'YM_IMAGE_WINDOW_TOOLTIP_ANNO_CLICKED', async (event, windowId, annoId) => {
      logger.debug('AnnotationWindow:SUB:YM_IMAGE_WINDOW_TOOLTIP_ANNO_CLICKED windowId:', windowId, 'annoId:', annoId, 'annoWin:', this.id);
      const windowProxy = this._miradorProxy.getWindowProxyById(windowId);
      const canvasId = windowProxy.getCurrentCanvasId();

      if (this._continuousPages) {
        const toc = await this._annotationTocCache.getToc(canvasId);
        const annotation = toc.annotations.filter(anno => anno['@id'] === annoId)[0];

        if (annotation) {
          this._listWidget.goToPageByTags(annotation.tocTags);
        }
      } else {
        this._listWidget.goToAnnotation(annoId, canvasId);
      }
    });
  }

  _subscribe(context, eventId, handler) {
    let saved;

    if (context === jQuery) {
      saved = this._jQuerySubscribed;
    } else if (context === this._miradorProxy) {
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
    for (let context of [jQuery, this._miradorProxy]) {
      let saved = context === jQuery ? this._jQuerySubscribed : this._miradorSubscribed;

      for (let [eventId, handlers] of Object.entries(saved)) {
        for (let handler of handlers) {
          console.log('UNSUB', eventId, handler);
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
  '      <div class="right"></div>',
  '    </div>',
  '    <div class="annowin_menu_tag_row">',
  '      <span class="menu_tag_selector_container"></span>',
  '    </div>',
  '  <div class="annowin_temp_row">',
  '    <span class="ui small orange button ym_button save">Save new order</span>',
  '    <span class="ui small orange button ym_button cancel">Cancel</span>',
  '  </div>',
  '  </div>',
  '  <div class="placeholder"></div>',
  '  <div class="annowin_list" tabindex="-1">',
  '  </div>',
  '</div>'
].join(''));
