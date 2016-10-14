export default {
  
  createAnnotation: function(options) {
    const _this = this;
    const anno = {
      '@context': 'http://iiif.io/api/presentation/2/context.json',
      '@type': 'oa:Annotation',
      motivation: ['oa:commenting'],
      on: null,
      resource: [
        {
          '@type': 'dctypes:Text',
          chars: '',
          format: 'text/html'
        }
      ],
      within: [
        'http://example.org/lists/1'
      ]
    };
    anno['@id'] = options.id || 'http://example.org/annotations/1';
    anno.resource[0].chars = options.chars || '';
    if (options.tags) {
      for (var i = 0; i < options.tags.length; ++i) {
        anno.resource.push(this.createTag(options.tags[i]));
      }
    }
    const targetConfigs = options.on;
    if (targetConfigs) {
      if (targetConfigs instanceof Array) {
        jQuery.each(targetConfigs, function(index, targetConfig) {
          anno.on.push(_this.createOnAttribute(targetConfig));
        });
      } else {
        anno.on = this.createOnAttribute(targetConfigs); 
      }
    } else {
      anno.on = this.createOnAttribute();
    }
    return anno;
  },
  
  createOnAttribute: function(config) {
    const on = {
      '@type': 'oa:SpecificResource',
      full: 'http://manifests.example.org/book1/canvas/1',
      selector: {
        '@type': 'oa:SvgSelector',
        value: '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<path xmlns="http://www.w3.org/2000/svg" ' +
          'd="M317.0,1760.3l68.2,0l0,0l68.2,0l0,43.8l0,43.8l-68.2,0l-68.2,0l0,-43.8z" ' +
          'data-paper-data="{&quot;rotation&quot;:0,&quot;annotation&quot;:null}" ' +
          'id="rectangle_47572cf2-282b-4366-b725-d6fe04bd5da7" ' +
          'fill-opacity="0" fill="#00bfff" fill-rule="nonzero" stroke="#00bfff" stroke-width="7.28983" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" ' +
          'font-family="sans-serif" font-weight="normal" font-size="12" ' +
          'text-anchor="start" style="mix-blend-mode: normal"/></svg>"'
      }
    };
    if (config) {
      if (config.type) {
        if (config.type == 'canvas') {
          on['@type'] = 'oa:SpecificResource';
          
        } else {
          on['@type'] = 'oa:Annotation';
          delete on.selector;
        }
      }
      if (config.targetId) {
        on.full = config.targetId;
      }
      if (config.svg) {
        on.selector.value = config.svg;
      }
    }
    return on;
  },
  
  createTag: function(value) {
    const tag = {
      "@type": "oa:Tag",
      chars: value
    };
    return tag;
  }

};