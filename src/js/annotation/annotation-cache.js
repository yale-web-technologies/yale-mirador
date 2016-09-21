export default function getAnnotationCache() {
  if (!instance) {
    instance = new AnnotationCache();
  }
  return instance;
};

let instance = null;

class AnnotationCache {
  constructor() {
    this._valid = true;
    if (window.indexedDB) {
      this.setupIndexedDb();
    } else {
      this._valid = false;
      console.log('IndexedDB is not available on this browser.');
    }
  }
  
  isValid() {
    return this._valid;
  }
  
  setupIndexedDb() {
    const _this = this;
    const db = new Dexie('anno_cache');
    
    db.version(1).stores({
      layers: 'id,jsonData',
      annosPerCanvas: 'canvasId,jsonData'
    });
    db.open().catch(function(e) {
      console.log('ERROR AnnotationCache#setupIndexDb open failed: ' + e);
      _this._valid = false;
    });
    this.db = db;
  }
  
  /**
   * @returns {object} a Promise
   */
  getLayers() {
    return this.db.layers.where('id').equals(1).first(function (row) {
      const data = row.jsonData;
      return (data instanceof Array) ? data : [];
    });
  }
  
  /**
   * @returns {object} a Promise
   */
  setLayers(layersJson) {
    const _this = this;
    return this.emptyTable('layers')
      .then(function() {
        return _this.db.layers.add({ id: 1, jsonData: layersJson})
          .catch(function(e) {
            console.log('ERROR AnnotatinCache#setLayers update failed: ' + e);
            throw e;
          });
      });
  }
  
  emptyTable(name) {
    const table = this.db.table(name);
    return this.db.transaction('rw', table, function() {
      table.each(function (item, cursor) {
        console.log('deleting ' + cursor.key);
        table.delete(cursor.key).catch(function(e) {
          console.log('ERROR deleting from table ' + name + ': ' + e);
        });
      });
    });
  }
}
