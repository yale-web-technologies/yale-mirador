import getLogger from 'util/logger';

// NOTE: ConfigFetcher is no longer used as of 10/27/2017.
// All settings are fed as arguments to App.init().
// This file has to be deleted after it has been verified that this
// new scheme works on the Drupal and Rails portals.

export default function getConfigFetcher() {
  if (!instance) {
    instance = new ConfigFetcher();
  }
  return instance;
}

let instance = null;

class ConfigFetcher {
  constructor() {
    this.logger = getLogger();
  }

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
    options.projectId = elem.attr('data-room-id'); // group or project ID

    options.canvasId = elem.attr('data-canvas-id') || '';
    options.tocTags = tocTagsStr ? tocTagsStr.split(',') : [];
    options.layerIds = layerIdsStr ? layerIdsStr.split(',') : [];
    options.annotationId = elem.attr('data-annotation-id') || null;

    return options;
  }

  /**
   * Retrieves settings from the server via a REST API.
   */
  fetchSettingsFromApi(baseUrl, roomId) {
    const url = baseUrl + '?room_id=' + roomId;
    this.logger.debug('ConfigFetcher#fetchSettingsFromApi url:', url);

    return new Promise(function(resolve, reject) {
      const dfd = jQuery.Deferred();
      jQuery.ajax({
        url: url,
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
