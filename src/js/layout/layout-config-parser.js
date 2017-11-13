import getLogger from 'util/logger';
import getMiradorProxyManager from 'mirador-proxy/mirador-proxy-manager';

const logger = getLogger();
const proxyMgr = getMiradorProxyManager();

export default class LayoutConfigParser {
  constructor(options) {
    this.options = Object.assign({
      imageWindowId: null,
      layerIds: [],
      toc: null, // annotation TOC
      tocTags: []
    }, options);
  }

  /**
   * All windows created are derived from a single Mirador image window
   * identified by this.options.imageWindowId
   */
  getWindowsConfig() {
    const annoId = this.options.annotationId;
    let layerIds = this.options.layerIds;
    let tocTags = this.options.tocTags;

    // If annotation ID is provided, everything else (layers, TOC)
    // gets derived from that annotation (provided values are ignored).
    if (annoId) {
      const annotation = this._findAnnotation(annoId);
      if (annotation) {
        layerIds = [annotation.layerId];
      } else {
        logger.error('LayoutConfigParser#getWindowsConfig cannot find annotation', annoId);
        return null;
      }
      if (this.options.toc) {
        tocTags = this.options.toc.getTagsFromAnnotationId(annoId);
        if (tocTags.length < 1) {
          logger.error('LayoutConfigParser#getWindowsConfig no toc tags for annotation', annoId);
        }
      }
    }

    const config = {
      windows: []
    };

    // Number of annotation windows is determined by number of layers
    if (layerIds instanceof Array && layerIds.length > 0) {
      for (let layerId of layerIds) {
        config.windows.push({
          type: 'ANNOTATION_WINDOW',
          miradorId: this.options.miradorId,
          imageWindowId: this.options.imageWindowId,
          layerId: layerId || null,
          annotationId: annoId || null,
          tocTags: tocTags || []
        });
      }
    }

    return config.windows.length > 0 ? config : null;
  }

  _findAnnotation(annotationId) {
    const windowProxy = proxyMgr.getWindowProxyById(this.options.imageWindowId);
    const annotations = windowProxy.getAnnotationsList();
    const candidates = annotations.filter(anno =>
        (anno['@id'] === annotationId));
    return candidates.length > 0 ? candidates[0] : null;
  }
}
