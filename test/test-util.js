export default {
  
  createAnnotation: function(options) {
    var anno = {
      '@context': 'http://iiif.io/api/presentation/2/context.json',
      '@id': 'http://example.org/annotations/1',
      '@type': 'oa:annotation',
      motivation: ['oa:commenting'],
      on: this.createOnAttribute(),
      resource: [
        {
          '@type': 'dctypes:Text',
          chars: 'hello world',
          format: 'text/html'
        }
      ],
      within: [
        'http://example.org/lists/1'
      ]
    };
    if (options.chars) {
      anno.resource[0].chars = options.chars;
    }
    return anno;
  },
  
  createOnAttribute: function() {
    var on = {
      '@type': 'oaSpecificResource',
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
    return on;
  }

};