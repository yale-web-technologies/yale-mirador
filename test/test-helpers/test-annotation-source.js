/**
 * See /src/js/annotations/annotations-source.js for real implementation
 */
export default class TestAnnotationSource {
  constructor(options) {
    this.options = Object.assign({
      fixture: null
    }, options);
    this.layers = [];
    console.log('Fixture:', JSON.stringify(this.options.fixture));
  }

  getLayers() {
  }

  getAnnotations(options) {
    console.log('TestAnnotationSource#getAnnotations options:', JSON.stringify(options));
    let annotations = this.options.fixture.perCanvas[options.canvasId];
    if (options.layerId) {
      annotations = annotations.filter(anno => anno.layerId === options.layerId);
    }
    return Promise.resolve(annotations);
  }

  createAnnotation(oaAnnotation) {
  }

  updateAnnotation(oaAnnotation) {
  }

  deleteAnnotation(annotationId) {
  }

  updateAnnotationListOrder(canvasId, layerId, annoIds) {
  }
}
