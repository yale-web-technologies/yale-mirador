// Implements inteface between Joosugi annotation explorer and Mirador endpoint
export default class AnnotationSource {
  constructor(options) {
    jQuery.extend(this, {
      endpoint: null // annotation query endpoint of Mirador
    }, options);
  }
  
  getLayers() {
    return this.endpoint.getLayers();
  }
  
  getAnnotations(canvasId) {
    console.log('AnnotationSource#getAnnotations canvasId: ' + canvasId);
    const _this = this;
    const dfd = new jQuery.Deferred();
    this.endpoint.set('dfd', dfd);
    this.endpoint.search({
      uri: canvasId
    });
    
    return new Promise(function(resolve, reject) {
      dfd.done(function() {
        resolve(_this.endpoint.annotationsList);
      });
      dfd.fail(function() {
        reject('Error AnnotationSource#getAnnotations failed for canvas ' + canvasId);
      });
    });
  }
}
