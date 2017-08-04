import getLogger from '../../util/logger';

const logger = getLogger();
const callbackKeys = new Set([
  'onSetPage'
]);

/**
 *  Navigation controller for the annotation window
 */
export default class AnnotationNav {
  constructor(options) {
    this.options = Object.assign({
      canvases: []
    }, options);

    this._pageNum = 0;
    this._numPages = this.options.canvases.length;
    this._activeRange = { startPage: -1, endPage: -1 }; // marks pages that are loaded and visible
    this._pageStateList = this._createPageStateList();
    this._callbacks = {};
  }

  getPage() {
    return this._pageNum;
  }

  setPage(pageNum) {
    if (pageNum >= 0 && pageNum < this._numPages) {
      const canvas = this._pageStateList[pageNum].canvas;

      this._pageNum = pageNum;
      return this._callbacks.onSetPage(pageNum, canvas);
    } else {
      throw 'AnnotationNav#setPage invalid pageNum ' + pageNum;
    }
  }

  getNumPages() {
    return this._numPages;
  }

  getPageElements() {
    return this._pageStateList.map(item => item.element);
  }

  getPageElement(pageNum) {
    return this._pageStateList[pageNum].element;
  }

  setPageElement(pageNum, elem) {
    this._pageStateList[pageNum].element = elem;
  }

  getCanvas(pageNum) {
    return this._pageStateList[pageNum].canvas;
  }

  isLoaded(pageNum) {
    return this._pageStateList[pageNum].loaded;
  }

  setLoaded(pageNum) {
    this._pageStateList[pageNum].loaded = true;
  }

  load(pageNum, annotations, toc) {
    const item = this._pageStateList[pageNum];
    item.annotations = annotations;
    item.toc = toc;
    item.loaded = true;
    this._addToActiveRange(pageNum);
  }

  unload(pageNum) {
    const item = this._pageStateList[pageNum];
    delete item.annotations;
    delete item.toc;
    item.loaded = false;
    this._removeFromActiveRange(pageNum);
  }

  get activeRange() {
    logger.debug('AnnotationNav get activeRange', this._activeRange.startPage, this._activeRange.endPage);
    return this._activeRange;
  }

  _addToActiveRange(pageNum) {
    logger.debug('AnnotationNav#_addToActiveRange', pageNum, this._activeRange.startPage, this._activeRange.endPage);
    const range = this._activeRange;
    if (range.startPage === -1 || pageNum < range.startPage) {
      range.startPage = pageNum;
    }
    if (range.endPage === -1 || pageNum > range.endPage) {
      range.endPage = pageNum;
    }
  }

  _removeFromActiveRange(pageNum) {
    logger.debug('AnnotationNav#_removeFromActiveRange', pageNum, this._activeRange.startPage, this._activeRange.endPage);
    const range = this._activeRange;
    if (pageNum === range.startPage) {
      ++ range.startPage;
      if (range.startPage >= this._numPages) {
        range.startPage = -1;
        range.endPage = -1;
      }
    }
    if (pageNum === range.endPage) {
      -- range.endtPage;
      if (range.endPage === -1) {
        range.startPage = -1;
      }
    }
  }

  getPageNumForCanvas(canvasId) {
    for (let i = 0; i < this._pageStateList.length; ++i) {
      if (this._pageStateList[i].canvas['@id'] === canvasId) {
        return i;
      }
    }
    return -1;
  }

  registerCallbacks(callbacksMap) {
    for (let [key, value] of Object.entries(callbacksMap)) {
      if (callbackKeys.has(key)) {
        this._callbacks[key] = value;
      } else {
        throw 'AnnotationNav#registerCallbacks invalid key ' + key;
      }
    }
  }

  _createPageStateList() {
    const pages = [];

    for (let canvas of this.options.canvases) {
      pages.push({
        toc: null,
        canvas: canvas,
        loaded: false,
        annotations: [],
        element: null
      });
    }
    return pages;
  }
}
