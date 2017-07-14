import {Anno, annoUtil} from '../import';
import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import getPageController from '../page-controller';
import getStateStore from '../state-store';
import LayerSelector from './layer-selector';
import util from '../util/util';

const logger = getLogger();

export default class AnnotationEditor {
  constructor(options) {
    logger.debug('AnnotationEditor#constructor options:', options);
    jQuery.extend(this, {
      windowId: null,
      miradorDriven: false, // true if created and managed by Mirador core.
      annotation: null,
      id: null,
      parent: null,
      endpoint: null,
      targetAnnotation: null, // target annotation (annotation annotated by this annotation)
      saveCallback: null,
      cancelCallback: null
    }, options);

    this._mode = options.mode; // "create", "update", or "merge"
    this._$anno = this.annotation ? Anno(this.annotation) : null;

    this._textDirectionClass = this._getTextDirectionClass(this._$anno);
    logger.debug('AnnotationEditor#constructor _useVerticalRL:', this._useVerticalRL);

    this.init();
    this.hide();
  }

  init() {
    this.miradorProxyManager = getMiradorProxyManager();
    this.endpoint = this.endpoint || this.miradorProxyManager.getWindowProxyById(this.windowId).getEndPoint();
    this.id = this.id || Mirador.genUUID();

    var tagsStr = this.annotation ? this._$anno.tags.join(' ') : '';
    this.element = jQuery(template({
      miradorDriven: this.miradorDriven,
      tags: tagsStr
    })).attr('id', this.id);

    if (!this.miradorDriven) {
      this.reload(this.parent);
    }
  }

  async reload(parent) {
    logger.debug('AnnotationEditor#reload parent:', parent);

    parent.prepend(this.element);
    const header = this.element.find('.header');
    const title = header.find('.title');
    this.textArea = this.element.find('textarea');
    this.layerSelectorContainer = this.element.find('.layer_select');
    this.layerSelector = new LayerSelector({
      parent: this.layerSelectorContainer
    });

    const layers = await this.endpoint.getLayers();

    this.layerSelector.init(layers).then(() => {
      if (this._mode === 'create') {
        title.text('Create Annotation');
        const lastLayer = getStateStore().getString('lastSelectedLayer');
        this.layerSelector.val(lastLayer);
      } else { // update
        title.text('');
        if (this.annotation) {
          this.textArea.val(this._$anno.bodyText);
          if (this.annotation.layerId) {
            this.layerSelector.val(this.annotation.layerId);
          }
        }
      }
      this.initTinyMce();
      this.bindEvents();
    }).catch(function(reason) {
      logger.error('ERROR AnnotationEditor#reload layerSelector.init failed - ' + reason);
    });
  }

  initTinyMce() {
    const _this = this;
    tinymce.init({
      selector: '#' + this.id + ' textarea',
      //plugins: 'link paste',
      plugins: 'link paste image',
      menubar: false,
      toolbar: 'bold italic fontsizeselect | bullist numlist | link image | undo redo | removeformat | TB_RL',
      fontsize_formats: '10px 12px 14px 18px 24px',
      statusbar: false,
      toolbar_items_size: 'small',
      default_link_target: '_blank',
      past_as_text: true, // from paste plugin
      resize: true,
      height: '140',
      theme_advanced_resizing: true,
      theme_advanced_statusbar_location: 'bottom',
      setup: function(editor) {
        editor.on('init', function(e) {
          this.getDoc().body.style.fontSize = '12px';
          tinymce.execCommand('mceFocus', false, e.target.id);
        });
        editor.on('focus', function(e) {
          logger.debug('TinyMCE on focus e:', e);
        });
        editor.addButton('TB_RL', {
          type: 'listbox',
          tooltip: 'Set text direction',
          icon: false,
          onselect: function(event) {
            _this._textDirectionClass = this.value();
          },
          values: [
            { text: 'Horizontal LR', value: 'horizontal-lr' },
            { text: 'Horizontal RL', value: 'horizontal-rl' },
            { text: 'Vertical LR', value: 'vertical-lr' },
            { text: 'Vertical RL', value: 'vertical-rl' },
          ],
          value: _this._textDirectionClass // initial value
        });
      }
    });
  }

  // Called by Mirador core
  show(selector) {
    logger.debug('AnnotationEditor#show', selector);
    if (selector) {
      this.reload(jQuery(selector));
    }
    this.element.show();
  }

  hide() {
    this.element.hide();
  }

  destroy() {
    this.element.remove();
  }

  // Called by Mirador core
  isDirty() {
    return this.getEditor().isDirty();
  }

  // Get tinymce editor
  getEditor() {
    return tinymce.get(this.textArea.attr('id'));
  }

  // Called by Mirador core - XXX seong
  getMode() {
    return this._mode;
  }

  getLoadedAnnotation() {
    return this._loadedAnnotation;
  }

  // Called by Mirador core
  createAnnotation(targetAnnotation) {
    var tagText = this.element.find('.tags_editor').val().trim();
    var resourceText = this.getEditor().getContent();
    var tags = [];
    var motivation = [];
    var resource = [];

    if (tagText) {
      tags = tagText.split(/\s+/);
    }

    if (tags && tags.length > 0) {
      motivation.push("oa:tagging");
      jQuery.each(tags, function(index, value) {
        resource.push({
          "@type": "oa:Tag",
          "chars": value
        });
      });
    }
    motivation.push("oa:commenting");
    resource.push({
      "@type": "dctypes:Text",
      "format": "text/html",
      "chars": resourceText,
      "style": this._textDirectionClass
    });

    var layerId = this.layerSelector.val();
    var annotation = {
      '@context': 'http://iiif.io/api/presentation/2/context.json',
      '@type': 'oa:Annotation',
      motivation: motivation,
      resource: resource,
      layerId: layerId
    };
    if (targetAnnotation) {
      annotation.on = {
        '@type': 'oa:Annotation',
        full: targetAnnotation['@id']
      };
    }
    logger.debug('AnnotationEditor#createAnnotation anno:', annotation);
    return annotation;
  }

  loadAnnotation(annotation) {
    this._mode = 'merge';
    this._loadedAnnotation = annotation;
    const $anno = Anno(annotation);

    // Reload the editor with the contents of the annotation
    const content = $anno.bodyText;
    this.layerSelector.val($anno.layerId);
    this.getEditor().setContent(content);

    const tags = $anno.tags;
    if (tags.length > 0) {
      this.element.find('.tags_editor').val(tags.join(' '));
    }

    // Prevent user from editing the merged content
    this.getEditor().getBody().setAttribute('contenteditable', false);
  }

  // Called by Mirador core
  updateAnnotation(oaAnno) {
    var tagText = this.element.find('.tags_editor').val().trim();
    var resourceText = this.getEditor().getContent();
    var tags = [];

    if (tagText) {
      tags = tagText.split(/\s+/);
    }

    var motivation = [],
      resource = [];

    //remove all tag-related content in annotation
    oaAnno.motivation = jQuery.grep(oaAnno.motivation, function(value) {
      return value !== 'oa:tagging';
    });
    oaAnno.resource = jQuery.grep(oaAnno.resource, function(value) {
      return value['@type'] !== 'oa:Tag';
    });

    //re-add tagging if we have them
    if (tags.length > 0) {
      oaAnno.motivation.push('oa:tagging');
      jQuery.each(tags, function(index, value) {
        oaAnno.resource.push({
          '@type': 'oa:Tag',
          chars: value
        });
      });
    }
    for (let value of oaAnno.resource) {
      if (value['@type'] === 'dctypes:Text') {
        value.chars = resourceText;
        value.style = this._textDirectionClass;
      }
    }
    const layerId = this.layerSelector.val();
    oaAnno.layerId = layerId;
    return oaAnno;
  }

  save() {
    var _this = this;
    var annotation = null;

    if (this._mode == 'create') {
      annotation = this.createAnnotation(this.targetAnnotation);
      this.endpoint.create(annotation, function(data) {
        var annotation = data;
        if (typeof _this.saveCallback === 'function') {
          _this.saveCallback(annotation);
        }
        _this.destroy();
      }, function() {
      });
    } else {
      annotation = this.updateAnnotation(this.annotation);
      this.endpoint.update(annotation, function(data) {
        if (typeof _this.saveCallback === 'function') {
          var annotation = data;
          var content = _this.getEditor().getContent().trim();
          _this.saveCallback(annotation, content);
        }
        _this.destroy();
      }, function() {
      });
    }
  }

  validate () {
    logger.debug('AnnotationEditor#validate target anno:', this.targetAnnotation);
    let msg = '';

    if (this._mode === 'create') {
      if (!this.targetAnnotation) {
        msg += 'Target annotation is missing.\n';
      }
    }
    if (this._mode === 'create' && !this.layerSelector.val()) {
      msg += 'Layer is not selected.\n';
    }
    if (this.getEditor().getContent().trim() === '') {
      msg += 'Please enter content.\n';
    }
    if (msg === '') {
      return true;
    } else {
      alert(msg);
      return false;
    }
  }

  bindEvents() {
    var _this = this;

    this.element.find('.ym_save').click(function() {
      if (_this.validate()) {
        _this.save();
      }
    });

    this.element.find('.ym_cancel').click(function() {
      _this.destroy();
      if (typeof _this.cancelCallback === 'function') {
        _this.cancelCallback();
      }
    });

    this.element.find('.ym_vertical_inc').click(function() {
      var iframeId = _this.getEditor().id + '_ifr';
      var element = tinyMCE.DOM.get(iframeId);
      var height = parseInt(tinyMCE.DOM.getStyle(element, 'height'), 10);
      tinyMCE.DOM.setStyle(element, 'height', (height + 75) + 'px');
    });

    this.element.find('.ym_vertical_dec').click(function() {
      var iframeId = _this.getEditor().id + '_ifr';
      var element = tinyMCE.DOM.get(iframeId);
      var height = parseInt(tinyMCE.DOM.getStyle(element, 'height'), 10);
      tinyMCE.DOM.setStyle(element, 'height', (height - 75) + 'px');
    });
  }

  /**
   * Get class name ($anno.bodyStyle) for text directions to save
   * with the annotation
   * @param {AnnotationWrapper} $anno
   */
  _getTextDirectionClass($anno) {
    let klass = '';
    if ($anno) {
      klass = $anno.bodyStyle;
      logger.debug('AnnotationEditor#_getTextDirectionClass class from anno:', klass);
      if (util.directionClasses.includes(klass)) {
        return klass;
      }
    }
    klass = getStateStore().getString('textDirection');
    logger.debug('AnnotationEditor#_getTextDirectionClass default from state:', klass);
    if (util.directionClasses.includes(klass)) {
        return klass;
    }
    return 'horizontal-lr';
  }
}

const template = Handlebars.compile([
  '<div class="ym_anno_editor">',
  '  <div class="header">',
  '    <span class="layer_select"></span>',
  '  </div>',
  '  <textarea></textarea>',
  '  <input class="tags_editor" placeholder="{{t "addTagsHere"}}…" {{#if tags}}value="{{tags}}"{{/if}}/>',
  '  {{#unless miradorDriven}}',
  '    <div class="bottom_row">',
  '        <button class="ym_save">Save</button>',
  '        <button class="ym_cancel">Cancel</button>',
  '      <div class="ym_float_right">',
  '        <i class="large caret up icon ym_vertical_dec"></i>',
  '        <i class="large caret down icon ym_vertical_inc"></i>',
  '      </div>',
  '    </div>',
  '  {{/unless}}',
  '</div>'
].join(''));
