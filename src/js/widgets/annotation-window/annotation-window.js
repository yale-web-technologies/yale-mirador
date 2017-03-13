import {annoUtil} from '../../import';
import getLogger from '../../util/logger';
import getMiradorProxyManager from '../../mirador-proxy/mirador-proxy-manager';
import getStateStore from '../../state-store';
import MenuTagSelector from '../menu-tag-selector';
import LayerSelector from '../layer-selector';
import session from '../../session';

const logger = getLogger();

export default class AnnotationWindow {
  constructor(options) {
    const _this = this;

    jQuery.extend(this, {
      id: null, // annotation window ID
      miradorId: null,
      canvasWindowId: null,
      appendTo: null,
      annotationListRenderer: null,
      explorer: null,
      initialLayerId: null,
      initialTocTags: null,
      annotationId: null
    }, options);

    logger.debug('AnnotationWindow#constructor options:', options);
    this._jQuerySubscribed = {};
    this._miradorSubscribed = {};
  }

  /**
   * @returns {Promise}
   */
  init() {
    const _this = this;
    const proxyMgr = getMiradorProxyManager();
    let annosToShow = [];

    if (!this.id) {
      this.id = Mirador.genUUID();
    }
    this.miradorProxy = proxyMgr.getMiradorProxy(this.miradorId);
    this.canvasWindow = this.miradorProxy.getWindowById(this.canvasWindowId);

    this.element = jQuery(template({}));
    this.appendTo.append(this.element);
    this.listElem = this.element.find('.annowin_list');

    if (!this.initialLayerId && this.annotationId) { // annotation ID was given in the URL
      annosToShow = this.canvasWindow.annotationsList.filter(anno => anno['@id'] === _this.annotationId);
      if (annosToShow.length > 0) {
        this.initialLayerId = annosToShow[0].layerId;
      }
    } else if (this.initialLayerId) { // layerIDs were given in the URL
      annosToShow = this.canvasWindow.annotationsList.filter(anno => anno.layerId == _this.initialLayerId);
      if (this.initialTocTags) {
        const toc = this.explorer.getAnnotationToc();
        if (toc) {
          annosToShow = annosToShow.filter(anno => toc.matchHierarchy(anno, this.initialTocTags));
        }
      }
    }

    this.initLayerSelector();
    this.addCreateWindowButton();
    this.tempMenuRow = this.element.find('.annowin_temp_row');
    this.placeholder = this.element.find('.placeholder');
    this.placeholder.text('Loading...').show();

    return this.reload()
    .catch(reason => {
      throw 'AnnotationWindow#init reload failed - ' + reason;
    })
    .then(() => {
      logger.debug('AnnotationWindow annosToShow:', annosToShow);
      if (this.annotationId && annosToShow.length > 0) {
        const finalTargetAnno = annoUtil.findFinalTargetAnnotation(annosToShow[0],
          _this.canvasWindow.annotationsList);
        _this.highlightAnnotations(annosToShow, 'SELECTED');
        _this.miradorProxy.publish('ANNOTATION_FOCUSED', [_this.id, finalTargetAnno]);
      }
      _this.bindEvents();
      return _this;
    })
    .catch(reason => {
      throw 'AnnotationWindow#init promise failed - ' + reason;
    });
  }

  destroy() {
    logger.debug('AnnotationWindow#destroy');
    this._unsubscribeAll();
  }

  initMenuTagSelector() {
    var _this = this;
    if (this.menuTagSelector) {
      this.menuTagSelector.destroy();
    }
    this.menuTagSelector = new MenuTagSelector({
      parent: this.element.find('.menu_tag_selector_container'),
      annotationExplorer: this.explorer,
      initialTags: this.initialTocTags,
      changeCallback: (value, text) => {
        logger.debug('Change from TOC selector: ', value);
        _this.updateList();
      }
    });
    this.initialTocTags = null;
  }

  initLayerSelector() {
    const _this = this;
    this._setCurrentLayerId(this.initialLayerId);
    this.layerSelector = new LayerSelector({
      parent: this.element.find('.layer_selector_container'),
      annotationExplorer: this.explorer,
      initialLayerId: this.initialLayerId,
      changeCallback: (value, text) => {
        logger.debug('Change from Layer selector: ', value);
        _this._setCurrentLayerId(value);
        _this.updateList();
      }
    });
  }

  addCreateWindowButton() {
    const _this = this;
    const parent = this.element.find('.annowin_layer_row');
    const button = jQuery('<div/>')
      .addClass('ym_create_window_button')
      .append(jQuery('<i class="fa fa-plus fa-lg fa-fw"></i>'));
    parent.append(button);
    button.click(event => {
      jQuery.publish('YM_ADD_WINDOW', {
        miradorId: _this.miradorId,
        canvasWindowId: _this.canvasWindowId
      });
    });
  }

  getCurrentLayerId() {
    return this.currentLayerId;
  }

  _setCurrentLayerId(layerId) {
    logger.debug('AnnotationWindow#_setCurrentLayerId layerId:', layerId);
    this.currentLayerId = layerId;
  }

  reload() {
    logger.debug('AnnotationWindow#reload');
    const _this = this;
    const state = getStateStore();

    this.placeholder.hide();

    if (state.getString('ANNO_CELL_FIXED') === 'true') {
      this.element.addClass('fixed_height_cells');
    } else {
      this.element.removeClass('fixed_height_cells');
    }

    var canvas = this.getCurrentCanvas();
    this.element.find('.title').text(canvas.label);

    if (this.explorer.getAnnotationToc()) {
      this.initMenuTagSelector();
      this.element.find('.annowin_menu_tag_row').show();
    } else {
      this.element.find('.annowin_menu_tag_row').hide();
    }
    const layersPromise = new Promise(function(resolve, reject) {
      _this.explorer.getLayers().then(function(layers) {
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
      if (_this.explorer.getAnnotationToc()) {
        _this.menuTagSelector.reload().then(function() {
          resolve();
        }).catch(function(reason) {
          reject('menuTagSelector.reload failed - ' + reason);
        });
      } else {
        resolve();
      }
    });

    return Promise.all([layersPromise, tocPromise]).then(function() {
      _this.updateList();
      return _this;
    });
  }

  updateList() {
    logger.debug('AnnotationWindow#updateList');
    const _this = this;
    const state = getStateStore();
    const options = {};

    options.parentElem = this.listElem;
    options.annotationWindow = this;
    options.isEditor = session.isEditor();
    options.annotationsList = this.canvasWindow.annotationsList;
    options.toc = this.explorer.getAnnotationToc();
    options.selectedTags = ['all'];
    if (this.explorer.getAnnotationToc()) {
      options.selectedTags = this.menuTagSelector.val().split('|');
    }
    options.isCompleteList = (options.selectedTags[0] === 'all'); // true if current window will show all annotations of a sortable list.
    options.layerId  = this.layerSelector.val();

    const count = this.annotationListRenderer.render(options);

    if (count === 0) {
      this.placeholder.text('No annotations found.').show();
    } else {
      this.placeholder.hide();
    }
  }

  getCurrentCanvas() {
    var window = this.canvasWindow;
    var id = window.canvasID;
    var canvases = window.manifest.getCanvases();
    return canvases.filter(function (canvas) {
      return canvas['@id'] === id;
    })[0];
  }

  highlightAnnotation(annoId) {
    this.listElem.find('.annowin_anno').each(function(index, value) {
      var annoElem = jQuery(value);
      var curAnnoId = annoElem.data('annotationId');
      if (curAnnoId === annoId) {
        annoElem.addClass('ym_anno_selected');
      } else {
        annoElem.removeClass('ym_anno_selected');
      }
    });
  }

  highlightAnnotations(annotations, flag) {
    const _this = this;
    const klass = (flag === 'TARGETING' ? 'ym_anno_targeting' :
      (flag === 'TARGETED' ? 'ym_anno_targeted' : 'ym_anno_selected'));
    let firstMatch = true;

    this.listElem.find('.annowin_anno').each(function(index, value) {
      const annoElem = jQuery(value);
      const annoId = annoElem.data('annotationId');
      let matched = false;

      jQuery.each(annotations, function(index, value) {
        const targetAnnotationId = value['@id'];
        if (annoId === targetAnnotationId) {
          matched = true;
          annoElem.addClass(klass);
          if (firstMatch) {
            _this.scrollToElem(annoElem);
            firstMatch = false;
          }
        }
      });
      if (!matched) {
        annoElem.removeClass(klass);
      }
    });
  }

  scrollToElem(annoElem) {
    logger.debug('annoElem.position().top:', annoElem.position().top);
    logger.debug('element.scrollTop():' + this.element.scrollTop());

    //this.listElem.animate({
    this.element.animate({
      //scrollTop: annoElem.position().top + this.listElem.scrollTop()
      scrollTop: annoElem.position().top + this.listElem.position().top + this.element.scrollTop()
    }, 250);
  }

  scrollToAnnotation(annoId) {
    logger.debug('AnnotationWindow#scrollToAnnotation annoId: ' + annoId);
    const _this = this;
    let found = false;

    this.listElem.find('.annowin_anno').each(function(index, value) {
      const elem = jQuery(value);
      if (elem.data('annotationId') === annoId) {
        found = true;
        _this.scrollToElem(elem);
        return false;
      }
    });
    return found;
  }

  clearHighlights() {
    this.listElem.find('.annowin_anno').each(function(index, value) {
      jQuery(value).removeClass('annowin_targeted')
        .removeClass('ym_anno_selected ym_anno_targeting ym_anno_targeted');
    });
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

  saveOrder() {
    var _this = this;
    var annoElems = this.listElem.find('.annowin_anno');
    var annoIds = [];
    jQuery.each(annoElems, function(index, value) {
      var annoId = jQuery(value).data('annotationId');
      annoIds.push(annoId);
    });
    var canvas = this.getCurrentCanvas();
    this.explorer.updateAnnotationListOrder(canvas['@id'], this.currentLayerId, annoIds)
    .then(() => {
      _this.tempMenuRow.hide();
    })
    .catch(reason => {
      _this.tempMenuRow.hide();
      const msg = 'AnnotationWindow#saveOrder updateAnnotationListOrder failed: ' + reason;
      throw msg;
    });
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

  bindEvents() {
    logger.debug('AnnotationWindow#bindEvents');
    var _this = this;

    this.element.find('.annowin_temp_row .ym_button').click(function(event) {
      _this.saveOrder();
    });

    this._subscribe(jQuery, 'YM_READY_TO_RELOAD_ANNO_WIN', function(event) {
      if (! _this.hasOpenEditor()) {
        _this.reload();
      }
    });

    this._subscribe(jQuery, 'ANNOTATION_FOCUSED', function(event, annoWinId, annotation) {
      logger.debug('Annotation window ' + _this.id + ' received annotation_focused event from ' + annoWinId);
      if (annoWinId === _this.id) {
        return;
      }
      _this.clearHighlights();

      const annotationsList = _this.canvasWindow.annotationsList;
      const layerId = _this.currentLayerId;
      const toc = _this.explorer.getAnnotationToc();

      if (toc) {
        const siblings = annoUtil.findTocSiblings(annotation, annotationsList, layerId, toc);
        logger.debug('AnnotationWindow SUB ANNOTATION_FOCUSED siblings:', siblings);
        if (siblings.length > 0) {
          _this.highlightAnnotations(siblings, 'SIBLING');
          return;
        }
      }
      const targeting = annoUtil.findTargetingAnnotations(annotation, annotationsList, layerId);
      if (targeting.length > 0) {
        _this.highlightAnnotations(targeting, 'TARGETING');
        return;
      }
      const targeted = annoUtil.findTargetAnnotations(annotation, annotationsList, layerId);
      if (targeted.length > 0) {
        _this.highlightAnnotations(targeted, 'TARGET');
        return;
      }
    });

    this._subscribe(jQuery, 'YM_ANNO_HEIGHT_FIXED', function(event, fixedHeight) {
      if (fixedHeight) {
        _this.element.addClass('fixed_height_cells');
      } else {
        _this.element.removeClass('fixed_height_cells');
      }
    });

    this._subscribe(this.miradorProxy, 'currentCanvasIDUpdated.' + this.canvasWindow.id, function(event) {
      _this.placeholder.text('Loading...').show();
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
  '    <div class="annowin_temp_row">',
  '      <div class="fluid ui small orange button ym_button">Click to save order</div>',
  '    </div>',
  '  </div>',
  '  <div class="placeholder"></div>',
  '  <div class="annowin_list">',
  '  </div>',
  '</div>'
].join(''));
