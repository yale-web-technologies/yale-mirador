import AnnotationRenderer from './renderer/annotation-renderer';
import AnnotationPageRenderer from './renderer/annotation-page-renderer';
import {AnnotationToc} from '../../import';
import getLogger from '../../util/logger';

const logger = getLogger();

/**
 * Scrollable list of annotations in an AnnotationWindow
 */
export default class AnnotationListWidget {
  constructor(options) {
    this.options = Object.assign({
      annotationWindow: null,
      rootElem: null,
      imageWindowId: null,
      canvases: [],
      layerId: null,
      state: null,
      isEditor: false,
      annotationExplorer: null,
      annotationPageRenderer: null,
      annotationRenderer: null,
      maxContentRelativeHeight: 5
    }, options);

    this._currentPageNum = 0;
    this._loading = false;
    this._tocSpec = this.options.state.getTransient('tagHierarchy');

    if (!this.options.annotationRenderer) {
      this.options.annotationRenderer = new AnnotationRenderer({
        annotationWindow: this.options.annotationWindow,
        state: this.options.state
      });
    }
    if (!this.options.annotationPageRenderer) {
      this.options.annotationPageRenderer = new AnnotationPageRenderer({
        annotationRenderer: this.options.annotationRenderer
      });
    }
  }

  init(layerId) {
    if (layerId) {
      this.options.layerId = layerId;
    }
    this.options.rootElem.empty();
    this._pageStateList = this._createPageStateList();
    this._createPageElements();
    this._bindEvents();
  }

  async moveToPage(pageNum) {
    logger.debug('AnnotationListWidgetr#moveToPage', pageNum);
    const rootElem = this.options.rootElem;

    if (pageNum !== -1) {
      this._deactivateAllPages();
      this._currentPageNum = pageNum;
      await this._activatePage(pageNum);
      await this._activateMorePagesForwardFirst(pageNum);
    } else {
      logger.error("AnnotationListWidget##moveTo couldn't find page number for", canvasId);
    }
  }

  async moveToCanvas(canvasId) {
    logger.debug('AnnotationListWidgetr#moveToCanvas', canvasId);
    const pageNum = this._getPageNum(canvasId);
    await this.moveToPage(pageNum);
  }

  async pageForward() {
    logger.debug('AnnotationListWidget#pageForward', this._loading);
    if (this._loading) {
      return;
    }
    this._loading = true;

    try {
      const pageNum = this._currentPageNum + 1;

      if (pageNum < this._pageStateList.length) {
        let nextPage = await this._activatePageForward(pageNum);
        if (nextPage < this._pageStateList.length) {
          nextPage = await this._activateMorePagesForwardFirst(nextPage);
        }
        this._currentPageNum = nextPage - 1;
        this._deactivatePagesFromBack();
        this._windBack();
      }
    } catch (e) {
      logger.error('AnnotationListWidget#pageForward failed', e);
    } finally {
      this._loading = false;
    }
  }

  async pageBack() {
    logger.debug('AnnotationListWidget#pageBack', this._loading);
    if (this._loading) {
      return;
    }
    this._loading = true;

    try {
      const pageNum = this._currentPageNum - 1;

      if (pageNum !== -1) {
        const nextPage = await this._activatePageBackward(pageNum);
        if (nextPage !== -1) {
          await this._activateMorePagesBackwardFirst(nextPage);
        }
        this._currentPageNum = nextPage + 1;
        this._deactivatePagesFromForward();
        this._windForward();
      }
      this._loading = false;
    } catch (e) {
      logger.error('AnnotationListWidget#pageBack failed', e);
    } finally {
      this._loading = false;
    }
  }

  async moveToAnnotation(annoId, canvasId) {
    logger.debug('AnnotationListWidget annoId:', annoId, 'canvasId:', canvasId);

    let targetPage = -1;

    for (let i = 0; i < this._pageStateList.length; ++i) {
      if (this._pageStateList[i].canvas['@id'] === canvasId) {
        targetPage = i;
        break;
      }
    }

    if (targetPage >= 0) {
      await this.moveToPage(targetPage);
      this._highlightAnnotation(annoId, canvasId);
    } else {
      logger.debug('AnnotationListWidget#scrollToAnnotation page not found for canvasId', canvasId);
    }
  }

  _highlightAnnotation(annoId, canvasId) {
    for (let pageItem of this._pageStateList) {
      for (let annoElem of pageItem.element.find('.annowin_anno')) {
        let $annoElem = jQuery(annoElem);
        let curAnnoId = $annoElem.data('annotationId');

        if (curAnnoId === annoId) {
          $annoElem.addClass('ym_anno_selected');
        } else {
          $annoElem.removeClass('ym_anno_selected');
        }
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

  /**
   * Create empty page elements under the root.
   */
  _createPageElements() {
    logger.debug('AnnotationListWidget#_createPageElements');
    for (var pageNum = 0; pageNum < this.options.canvases.length; ++pageNum) {
      let pageItem = this._pageStateList[pageNum];
      let html = pageTemplate({pageNum: pageNum});
      let pageElem = jQuery(html);
      this.options.rootElem.append(pageElem);
      pageElem.hide();
      pageItem.element = pageElem;
    }
  }

  _getPageNum(canvasId) {
    for (let i = 0; i < this._pageStateList.length; ++i) {
      let item = this._pageStateList[i];
      if (item.canvas['@id'] === canvasId) {
        return i;
      }
    }
    return -1;
  }

  async _activatePage(pageNum) {
    logger.debug('AnnotationListWidget#_activatePage', pageNum);
    if (pageNum < 0 || pageNum >= this._pageStateList.length) {
      logger.error('AnnotationListWidget#_activatePage invalid pageNum', pageNum);
      return;
    }
    this._currentPageNum = pageNum;

    const pageItem = this._pageStateList[pageNum];
    if (!pageItem.loaded) {
      pageItem.loaded = true;
      await this._loadPage(pageNum);
    }

    //if (pageItem.annotations.length > 0) {
      pageItem.element.show();
    //}
  }

  async _activatePageForward(pageNum) {
    let pageItem = this._pageStateList[pageNum];
    await this._activatePage(pageNum);
    logger.debug('AnnotationListWidget#_activatePageForward pageNum:', pageNum, 'pageItem.annotations after activate:', pageItem.annotations);

    let nextPage = pageNum + 1;

    while (pageItem.annotations.length === 0 && nextPage < this._pageStateList.length) {
      await this._activatePage(nextPage);
      pageItem = this._pageStateList[nextPage];
      logger.debug('AnnotationListWidget#_activatePageForward page:', nextPage, 'pageItem.annotations after activate:', pageItem.annotations);
      ++nextPage;
    }
    return nextPage;
  }

  async _activatePageBackward(pageNum) {
    await this._activatePage(pageNum);

    let pageItem = this._pageStateList[pageNum];
    let nextPage = pageNum - 1;

    while (pageItem.annotations.length === 0 && nextPage >= 0) {
      await this._activatePage(nextPage);
      pageItem = this._pageStateList[nextPage];
      --nextPage;
    }
    return nextPage;
  }

  async _activateMorePagesForwardFirst(pageNum) {
    logger.debug('AnnotationListWidget#_activateMorePagesForwardFirst', pageNum);
    const numCanvases = this.options.canvases.length;
    const nextPage = await this._activateMorePagesForward(pageNum, numCanvases);
    await this._activateMorePagesBackward(pageNum, numCanvases);

    return nextPage;
  }

  async _activateMorePagesBackwardFirst(pageNum, numPages) {
    logger.debug('AnnotationListWidget#_activateMorePagesBackwardFirst', pageNum, numPages);
    const numCanvases = this.options.canvases.length;
    const nextPage = await this._activateMorePagesBackward(pageNum, numCanvases);

    await this._activateMorePagesForward(pageNum, numCanvases);

    return nextPage;
  }

  _windBack() {
    const rootElem = this.options.rootElem;
    const scrollTop = rootElem.scrollTop();
    const diff = rootElem[0].scrollHeight - rootElem.scrollTop() - rootElem.height();

    if (diff === 0) {
      logger.debug('Winding back');
      this.options.rootElem.scrollTop(scrollTop - 5);
    }
  }

   _windForward() {
    logger.debug('_windForward');
    const rootElem = this.options.rootElem;
    const scrollTop = rootElem.scrollTop();

    if (scrollTop === 0) {
      logger.debug('Winding forward');
      this.options.rootElem.scrollTop(scrollTop + 5);
    }
  }

  async _activateMorePagesForward(pageNum, numPages) {
    logger.debug('AnnotationListWidget#_activateMorePagesForward', pageNum, numPages);
    const rootElem = this.options.rootElem;
    let nextPage = pageNum;

    while (nextPage < numPages) {
      logger.debug('AnnotationListWidget#_activateMorePagesForward nextPage:', nextPage, 'numPages:', numPages, 'scroll height:', rootElem[0].scrollHeight, 'element height:', rootElem.height());
      nextPage = await this._activatePageForward(nextPage);
      if (rootElem[0].scrollHeight > rootElem.height()) {
        break;
      }
    }
    return nextPage;
  }

  async _activateMorePagesBackward(pageNum) {
    logger.debug('AnnotationListWidget#_activateMorePagesBackward', pageNum);
    const rootElem = this.options.rootElem;
    let nextPage = pageNum;

    while (nextPage >= 0) {
      logger.debug('AnnotationListWidget#_activateMorePagesBackward nextPage:', nextPage, 'scroll height:', rootElem[0].scrollHeight, 'element height:', rootElem.height());
      nextPage = await this._activatePageBackward(nextPage);
      if (rootElem[0].scrollHeight > rootElem.height()) {
        break;
      }
    }
    return nextPage;
  }

  _deactivatePage(pageNum) {
    logger.debug('AnnotationListWidget#_deactivatePage', pageNum);
    const pageItem = this._pageStateList[pageNum];
    pageElem.hide();
  }

  _deactivatePagesFromForward() {
    logger.debug('AnnotationListWidget#_deactivatePagesFromForward');
    const rootElem = this.options.rootElem;
    const rootElemHeight = rootElem.height();
    const maxHeight = this.options.maxContentRelativeHeight * rootElemHeight;

    for (let nextPage = this._pageStateList.length - 1;
         nextPage > this._currentPageNum && rootElem[0].scrollHeight - rootElemHeight > maxHeight;
         --nextPage)
    {
      logger.debug('AnnotationListWidget#_deactivatePagesBackward nextPage:', nextPage, 'scroll height:', rootElem[0].scrollHeight, 'maxHeight:', maxHeight);
      let pageItem = this._pageStateList[nextPage];
      console.log('HIDING ', nextPage);
      pageItem.element.hide();
    }
  }

  _deactivatePagesFromBack() {
    logger.debug('AnnotationListWidget#_deactivatePagesFromBack');
    const rootElem = this.options.rootElem;
    const rootElemHeight = rootElem.height();
    const maxHeight = this.options.maxContentRelativeHeight * rootElemHeight;

    for (let nextPage = 0;
         nextPage < this._currentPageNum && rootElem[0].scrollHeight - rootElemHeight > maxHeight;
         ++nextPage)
    {
      logger.debug('AnnotationListWidget#_deactivatePagesFromBack nextPage:', nextPage, 'scroll height:', rootElem[0].scrollHeight, 'maxHeight:', maxHeight);
      let pageItem = this._pageStateList[nextPage];
      console.log('HIDING ', nextPage);
      pageItem.element.hide();
    }
  }

  _deactivateAllPages() {
    for (let nextPage = 0; nextPage < this._pageStateList.length; ++nextPage) {
      let pageItem = this._pageStateList[nextPage];
      pageItem.element.hide();
    }
  }

  async _loadPage(pageNum) {
    logger.debug('AnnotationListWidget#_loadPage pageNum:', pageNum);
    const pageItem = this._pageStateList[pageNum];
    const annotations = await this.options.annotationExplorer.getAnnotations({
      canvasId: pageItem.canvas['@id']
    });
    const toc = this._tocSpec ?
      new AnnotationToc(this._tocSpec, annotations, {logger: logger}) : null;
    logger.debug('AnnotationListWidget#_loadPage toc:', toc);

    pageItem.annotations = annotations.filter(anno => anno.layerId === this.options.layerId);
    pageItem.toc = toc;

    this.options.annotationPageRenderer.render({
      annotationWindow: this.options.annotationWindow,
      container: pageItem.element,
      canvas: pageItem.canvas,
      annotations: annotations,
      layerId: this.options.layerId,
      annotationToc: toc,
      isEditor: this.options.isEditor,
      pageNum: pageNum
    });
  }

  _lessPagesFrom(pageNum) {
    const numCanvases = this.options.canvases.length;
  }

  _bindEvents() {
    const _this = this;

    this.options.rootElem.scroll(function(event) {
      const elem = jQuery(this);
      const scrollTop = elem.scrollTop();
      const currentPos = scrollTop + elem.height();
      const contentHeight = this.scrollHeight;

      //logger.debug('contentHeight:', contentHeight, 'scrollTop:', scrollTop, 'scroll bottom:', currentPos);

      if (scrollTop < 20) {
        _this.pageBack();
      } else if (contentHeight - currentPos < 20) {
        _this.pageForward();
      }
    });
  }
}

const pageTemplate = Handlebars.compile([
  '<div class="ym-annotation-page page-{{pageNum}}">',
  '</div>'
].join(''));
