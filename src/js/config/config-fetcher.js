export default function getConfigFetcher() {
  if (!instance) {
    instance = new ConfigFetcher();
  }
  return instance;
}

let instance = null;

class ConfigFetcher {

  /**
   * Retrieves parameters passed via HTML attributes.
   */
  fetchSettingsFromHtml(elem) {
    const options = {};
    const tocTagsStr = elem.attr('data-toc-tags') || '';
    const layerIdsStr = elem.attr('data-layer-ids') || '';

    options.apiUrl = elem.attr('data-settings-url');
    options.roomId = elem.attr('data-room-id');
    
    options.manifestUri = elem.attr('data-manifest-url');
    options.groupId = elem.attr('data-group-id'); // group or project ID
    
    options.canvasId = elem.attr('data-canvas-id') || '';
    options.tocTags = tocTagsStr ? tocTagsStr.split(',') : [];
    options.layerIds = layerIdsStr ? layerIdsStr.split(',') : [];
    options.annotationId = elem.attr('data-annotation-id') || null;
    
    return options;
  }
  
  /**
   * Retrieves settings from the server via a REST API.
   */
  fetchSettingsFromApi(url, roomId) {
    return new Promise(function(resolve, reject) {
      const dfd = jQuery.Deferred();
      jQuery.ajax({
        url: url + '?room_id=' + roomId,
        success: function(data) {
          resolve(data);
        },
        error: function() {
          reject('Failed to fetch server settings from ' + url);
        }
      });
    });
  }
}
