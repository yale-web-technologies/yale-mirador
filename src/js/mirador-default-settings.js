// Settings for IIIF/Mirador core.
// See settings.js in IIIF/Mirador core for defaults that
// this file overrides.

export default {
  id: 'viewer',
  saveSession: false,
  layout: '1x1',
  data: [],
  buildPath: '/',
  i18nPath: '/locales/',
  imagesPath: '/images/',
  logosPath: '/images/logos/',
  mainMenuSettings: {
    show: false,
  },
  windowObjects: [
    {
      loadedManifest: null,
      viewType: 'ImageView',
      displayLayout: false,
      bottomPanel: true,
      sidePanel: true
    }
  ],
  annotationBodyEditor: {
    module: 'AnnotationEditor',
    options: {
      miradorDriven: true,
      mode: 'create'
    }
  },
  annotationLayer: true,
  annotationEndpoint: {
    name: 'Yale Annotations',
    module: 'YaleEndpoint',
    options: {
      prefix: null
     }
  },
  extension: {}
};
