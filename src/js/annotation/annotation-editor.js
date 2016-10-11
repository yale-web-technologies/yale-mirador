import LayerSelector from '../widgets/layer-selector';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import annoUtil from '../annotation/anno-util';

export default class AnnotationEditor {
  constructor(options) {
    jQuery.extend(this, {
      miradorDriven: false, // true if created and managed by Mirador core.
      windowId: null,
      annotation: null,
      id: null,
      parent: null,
      canvasWindow: null, // reference window that contains the canvas
      endpoint: null,
      targetAnnotation: null, // target annotation (annotation annotated by this annotation)
      saveCallback: null,
      cancelCallback: null
    }, options);

    this.init();
    this.hide();
  }
  
  init() {
    this._mode = null; // "create", "update", or "merge"
    this.miradorProxyManager = getMiradorProxyManager();
    this.endpoint = this.endpoint || this.miradorProxyManager.getWindowProxyById(this.windowId).getEndPoint();
    this.id = this.id || Mirador.genUUID();
    
    var tagsStr = this.annotation ? annoUtil.getTags(this.annotation).join(' ') : '';
    this.element = jQuery(template({
      miradorDriven: this.miradorDriven,
      tags: tagsStr
    })).attr('id', this.id);
      
    if (!this.miradorDriven) {
      this.reload(this.parent);
    }
  }
  
  reload(parent) {
    var _this = this;
    
    parent.prepend(this.element);
    var header = this.element.find('.header');
    var title = header.find('.title');
    this.textArea = this.element.find('textarea');
    this.layerSelectorContainer = this.element.find('.layer_select');
    this.layerSelector = new LayerSelector({
      parent: this.layerSelectorContainer,
      endpoint: this.endpoint
    });
    var dfd = this.layerSelector.init();
    
    dfd.done(function() {
      if (_this._mode === 'create') {
        title.text('Create Annotation');
      } else { // update
        title.text('');
      }
      if (_this.annotation) {
        _this.textArea.val(annoUtil.getAnnotationText(_this.annotation));
        if (_this.annotation.layerId) {
          _this.layerSelector.val(_this.annotation.layerId);
        }
      }

      // Sometimes the textarea is not set up with tinymce.
      // Trying to see if helps to delay the call to tinymce.init.
      setTimeout(function() {
        _this.initTinyMce();
        _this.bindEvents();
      }, 0);
    });
  }
  
  initTinyMce(textAreaSelector) {
    tinymce.init({
      selector: '#' + this.id + ' textarea',
      plugins: 'link paste',
      menubar: false,
      toolbar: 'bold italic fontsizeselect | bullist numlist | link | undo redo | removeformat',
      fontsize_formats: '10px 12px 14px 16px 18px',
      statusbar: false,
      toolbar_items_size: 'small',
      default_link_target: '_blank',
      past_as_text: true, // from paste plugin
      resize: true,
      height: '140',
      theme_advanced_resizing: true,
      theme_advanced_statusbar_location: 'bottom',
      setup: function(ed) {
        ed.on('init', function() {
          this.getDoc().body.style.fontSize = '12px';
        });
      }
    });
  }
  
  // Called by Mirador core
  show(selector) {
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
      "chars": resourceText
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
    console.log('AnnotationEditor#createAnnotation anno: ' + JSON.stringify(annotation, null, 2));
    return annotation;
  }
  
  loadAnnotation(annotation) {
    this._mode = 'merge';
    this._loadedAnnotation = annotation;
    
    // Reload the editor with the contents of the annotation
    const content = annoUtil.getAnnotationText(annotation);
    this.layerSelector.val(annotation.layerId);
    this.getEditor().setContent(content);
    
    const tags = annoUtil.getTags(annotation);
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
    jQuery.each(oaAnno.resource, function(index, value) {
      if (value['@type'] === 'dctypes:Text') {
        value.chars = resourceText;
      }
    });
    
    var layerId = this.layerSelector.val();
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
    console.log('AnnotationEditor#validate target anno: ');
    console.dir(this.targetAnnotation);

    var msg = '';
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
    
    this.element.find('.save').click(function() {
      if (_this.validate()) {
        _this.save();
      }
    });
    
    this.element.find('.cancel').click(function() {
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
  '        <button class="save">Save</button>',
  '        <button class="cancel">Cancel</button>',
  '      <div class="ym_float_right">',
  '        <i class="large caret up icon ym_vertical_dec"></i>',
  '        <i class="large caret down icon ym_vertical_inc"></i>',
  '      </div>',
  '    </div>',
  '  {{/unless}}',
  '</div>'
].join(''));