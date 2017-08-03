import AnnotationRenderer from './renderer/annotation-renderer';
import AnnotationPageRenderer from './renderer/annotation-page-renderer';
import {Anno, AnnotationToc, annoUtil} from '../../import';
import getApp from '../../app';
import getLogger from '../../util/logger';
import getModalAlert from '../../widgets/modal-alert';

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
    this._tocSpec2 = this.options.state.getTransient('tocSpec');
    this._groupHeaderHeight = 19;

    if (!this.options.annotationRenderer) {
      this.options.annotationRenderer = new AnnotationRenderer({
        annotationWindow: this.options.annotationWindow,
        state: this.options.state
      });
    }
    if (!this.options.annotationPageRenderer) {
      this.options.annotationPageRenderer = new AnnotationPageRenderer({
        annotationRenderer: this.options.annotationRenderer,
        annotationExplorer: this.options.annotationExplorer
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

  getCurrentPageNum() {
    return this._currentPageNum;
  }

  getCurrentPageItem() {
    return this._pageStateList[this._currentPageNum];
  }

  async moveToPage(pageNum) {
    logger.debug('AnnotationListWidgetr#moveToPage', pageNum);
    const rootElem = this.options.rootElem;
    const imageWindowProxy = this.options.annotationWindow.getImageWindowProxy();
    const oldCanvasId = imageWindowProxy.getCurrentCanvasId();
    const newPageItem = this._pageStateList[pageNum];
    const newCanvasId = newPageItem.canvas['@id'];

    if (pageNum !== -1) {
      this._deactivateAllPages();
      this._currentPageNum = pageNum;
      await this._activatePage(pageNum);

      if (rootElem[0].scrollHeight <= rootElem.height()) {
        await this._activateMorePagesForwardFirst(pageNum);
      }
      await this.scrollToPage(pageNum, true);

      if (oldCanvasId !== newCanvasId) {
        imageWindowProxy.setCurrentCanvasId(newCanvasId, {
          eventOriginatorType: 'AnnotationWindow'
        });
      }
    } else {
      logger.error("AnnotationListWidget##moveTo couldn't find page number for", canvasId);
    }
  }

  async moveToCanvas(canvasId) {
    logger.debug('AnnotationListWidgetr#moveToCanvas', canvasId);
    const pageNum = this._getPageNum(canvasId);
    await this.moveToPage(pageNum);
  }

  async moveToTag(tagValue) {
    logger.debug('AnnotationListWidgetr#moveToTag', tagValue);
    const canvasIds = this._tocSpec2.canvasMap[tagValue];
    if (canvasIds instanceof Array && canvasIds.length > 0) {
      await this.moveToCanvas(canvasIds[0]);
      this.scrollToTag(tagValue);
    }
  }

  async moveToTags(tags) {
    logger.debug('AnnotationListWidgetr#moveToTags', tags);
    const canvasIds = this._tocSpec2.canvasMap[tags[0]];
    if (canvasIds instanceof Array && canvasIds.length > 0) {
      await this.moveToCanvas(canvasIds[0]);
      this.scrollToTags(tags);
    }
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
        this._currentPageNum = nextPage;
        if (nextPage < this._pageStateList.length) {
          nextPage = await this._activateMorePagesForwardFirst(nextPage);
        }
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
        this._currentPageNum = nextPage;
        if (nextPage !== -1) {
          await this._activateMorePagesBackwardFirst(nextPage);
        }
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
    logger.debug('AnnotationListWidget#moveToAnnotation annoId', annoId, 'canvasId:', canvasId);

    let targetPage = -1;

    for (let i = 0; i < this._pageStateList.length; ++i) {
      if (this._pageStateList[i].canvas['@id'] === canvasId) {
        targetPage = i;
        break;
      }
    }

    if (targetPage >= 0) {
      const pageItem = this._pageStateList[targetPage];
      await this.moveToPage(targetPage);

      this.scrollToAnnotation(annoId);
      this.clearAnnotationHighlights();
      this.highlightAnnotation(annoId, 'SELECTED');
    } else {
      logger.debug('AnnotationListWidget#scrollToAnnotation page not found for canvasId', canvasId);
    }
  }

  /**
   * The page element must have already been loaded for this function to work.
   *
   * @param {number} pageNum
   */
  scrollToPage(pageNum, alignToTop) {
    const pageItem = this._pageStateList[pageNum];
    const pageHeaderElem = pageItem.element.find('.page-header');

    this._unbindScrollEvent();

    return new Promise((resolve, reject) => {
      this.options.rootElem.scrollTo(pageHeaderElem, {
        onAfter: () => {
          this._bindScrollEvent();
          resolve();
        }
      });
    });
  }

  scrollToTag(targetTagValue) {
    let targetElem = null;

    this.options.rootElem.find('.annowin_group_header').each((index, value) => {
      const headerElem = jQuery(value);
      const tagValue = headerElem.data('tags')[0];
      if (tagValue === targetTagValue) {
        targetElem = headerElem;
        return false;
      }
    });
    if (targetElem) {
      targetElem[0].scrollIntoView();
    } else {
      logger.warning('AnnotationListWidget#scrollToTag Header element not found for', targetTagValue);
    }
  }

  scrollToTags(targetTags) {
    logger.debug('AnnotationListWidget#srollToTags targetTags:', targetTags);
    let targetElem = null;

    this.options.rootElem.find('.annowin_group_header').each((index, value) => {
      const headerElem = jQuery(value);
      const tags = headerElem.data('tags');

      if (targetTags.length === 1) {
        if (tags[0] === targetTags[0]) {
          targetElem = headerElem;
          return false;
        }
      } else if (tags[0] === targetTags[0] && tags[1] === targetTags[1]) {
        targetElem = headerElem;
        return false;
      }
    });
    if (targetElem) {
      targetElem[0].scrollIntoView();
      targetElem.next().click();
    } else {
      logger.warning('AnnotationListWidget#scrollToTags Header element not found for', targetTags);
    }
  }

  scrollToElem(annoElem, yOffset) {
    this._unbindScrollEvent();

    return new Promise((resolve, reject) => {
      this.options.rootElem.scrollTo(annoElem, {
        offset: {
          top: yOffset || -this._groupHeaderHeight
        },
        onAfter: () => {
          this._bindScrollEvent();
          resolve();
        }
      });
    });
  }

  scrollToAnnotation(annotationId, yOffset) {
    logger.debug('AnnotationListWidget#scrollToAnnotation annotationId:', annotationId, 'yOffset:', yOffset);
    for (let annoElem of this.getAnnotationElems()) {
      const $annoElem = jQuery(annoElem);
      if ($annoElem.data('annotationId') === annotationId) {
        return this.scrollToElem($annoElem, yOffset);
      }
    }
  }

  clearAnnotationHighlights() {
    for (let elem of this.getAnnotationElems()) {
      jQuery(elem).removeClass('ym_anno_selected');
    }
  }

  highlightAnnotations(annotations, flag) {
    logger.debug('AnnotationListWidget#highlightAnnotations annotations:', annotations, 'flag:', flag);

    this.clearAnnotationHighlights();

    for (let annoElem of this.getAnnotationElems()) {
      const $annoElem = jQuery(annoElem);
      const annoId = $annoElem.data('annotationId');

      for (let anno of annotations) {
        if (anno['@id'] === annoId) {
          this.highlightAnnotationElem($annoElem, flag);
        }
      }
    }
  }

  highlightAnnotation(annoId, flag) {
    for (let annoElem of this.getAnnotationElems()) {
      let $annoElem = jQuery(annoElem);

      if ($annoElem.data('annotationId') === annoId) {
        this.highlightAnnotationElem($annoElem, flag);
      }
    }
  }

  highlightAnnotationElem(annoElem, flag) {
    logger.debug('AnnotationListWidget#highlightAnnotationElem annoElem:', annoElem, 'flag:', flag, 'annoId:', annoElem.data('annotationId'));
    const klass = (flag === 'TARGETING' ? 'ym_anno_targeting' :
      (flag === 'TARGETED' ? 'ym_anno_targeted' : 'ym_anno_selected'));

    annoElem.addClass(klass);
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
    const pageRenderer = this.options.annotationPageRenderer;

    for (let pageNum = 0; pageNum < this.options.canvases.length; ++pageNum) {
      let pageItem = this._pageStateList[pageNum];
      let pageElem = pageRenderer.createPageElement({
        pageNum: pageNum,
        canvasId: pageItem.canvas['@id'],
        canvasLabel: pageItem.canvas.label,
        layerId: this.options.layerId
      });

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
    //this._currentPageNum = pageNum;

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
    let nextPage = pageNum;

    if (pageNum < this._pageStateList.length - 1) {
      ++nextPage;
    //while (pageItem.annotations.length === 0 && nextPage < this._pageStateList.length) {
      await this._activatePage(nextPage);
    //  pageItem = this._pageStateList[nextPage];
    //  logger.debug('AnnotationListWidget#_activatePageForward page:', nextPage, 'pageItem.annotations after activate:', pageItem.annotations);
    //  ++nextPage;
    //}
    }
    return nextPage;
  }

  async _activatePageBackward(pageNum) {
    await this._activatePage(pageNum);

    let pageItem = this._pageStateList[pageNum];
    let nextPage = pageNum;

    if (pageNum > 0) {
      --nextPage;

      //while (pageItem.annotations.length === 0 && nextPage >= 0) {
        await this._activatePage(nextPage);
      //  pageItem = this._pageStateList[nextPage];
      //  --nextPage;
      //  ++count;
      //}
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
      this._unbindScrollEvent();
      this.options.rootElem.scrollTop(scrollTop - 5);
      this._bindScrollEvent();
    }
  }

   _windForward() {
    logger.debug('_windForward');
    const rootElem = this.options.rootElem;
    const scrollTop = rootElem.scrollTop();

    if (scrollTop === 0) {
      logger.debug('Winding forward');
      this._unbindScrollEvent();
      this.options.rootElem.scrollTop(scrollTop + 5);
      this._bindScrollEvent();
    }
  }

  async _activateMorePagesForward(pageNum, numPages) {
    logger.debug('AnnotationListWidget#_activateMorePagesForward', pageNum, numPages);
    const rootElem = this.options.rootElem;
    let nextPage = pageNum;

    while (nextPage < numPages) {
      logger.debug('AnnotationListWidget#_activateMorePagesForward nextPage:', nextPage, 'numPages:', numPages, 'scroll height:', rootElem[0].scrollHeight, 'element height:', rootElem.height());
      let currentPage = nextPage;
      nextPage = await this._activatePageForward(currentPage);
      if (nextPage === currentPage || rootElem[0].scrollHeight > rootElem.height()) {
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
      let currentPage = nextPage;
      nextPage = await this._activatePageBackward(currentPage);
      if (nextPage === currentPage || rootElem[0].scrollHeight > rootElem.height()) {
        break;
      }
    }
    return nextPage;
  }

  _deactivatePage(pageNum) {
    logger.debug('AnnotationListWidget#_deactivatePage', pageNum);
    const pageItem = this._pageStateList[pageNum];
    pageItem.element.hide();
  }

  _deactivatePagesFromForward() {
    logger.debug('AnnotationListWidget#_deactivatePagesFromForward');
    const rootElem = this.options.rootElem;
    const rootElemHeight = rootElem.height();
    const maxHeight = this.options.maxContentRelativeHeight * rootElemHeight;

    for (let nextPage = this._pageStateList.length - 1;
         nextPage > this._currentPageNum + 1 && rootElem[0].scrollHeight - rootElemHeight > maxHeight;
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
         nextPage < this._currentPageNum - 1 && rootElem[0].scrollHeight - rootElemHeight > maxHeight;
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
    getModalAlert().show('Loading');
    const pageItem = this._pageStateList[pageNum];
    const canvasId = pageItem.canvas['@id'];
    const annotations = await this.options.annotationExplorer.getAnnotations({
      canvasId: canvasId
    });
    const tocCache = getApp().getAnnotationTocCache();
    const toc = tocCache ? await tocCache.getToc(canvasId) : null;
    logger.debug('AnnotationListWidget#_loadPage toc:', toc);

    pageItem.annotations = annotations.filter(anno => anno.layerId === this.options.layerId);
    pageItem.toc = toc;

    this.options.annotationPageRenderer.render(pageItem.element, {
      annotations: annotations,
      annotationToc: toc,
      isEditor: this.options.isEditor,
      pageNum: pageNum
    });
    getModalAlert().hide();
  }

  _lessPagesFrom(pageNum) {
    const numCanvases = this.options.canvases.length;
  }

  clearHighlights() {
    this.options.rootElem.find('.annowin_anno').each((index, value) => {
      jQuery(value).removeClass('annowin_targeted')
        .removeClass('ym_anno_selected ym_anno_targeting ym_anno_targeted');
    });
  }

  getAnnotationElems() {
    return this.options.rootElem.find('.annowin_anno').toArray();
  }

  /**
   * Find annotation's siblings from annotations
   * A sibling is an annotation that points to the same TOC node.
   * For example, annotation A and B are siblings if they both belong to
   * ["chapter1", "scene2", "p1"].
   */
  getTocSiblingElems(annotation, annotations, layerId, toc) {
    const result = [];
    let siblings = annoUtil.findTocSiblings(annotation, annotations, layerId, toc);
    siblings = siblings.filter(anno => this._getParagraphTag(anno) === this._getParagraphTag(annotation));

    for (let annoElem of this.getAnnotationElems()) {
      const $annoElem = jQuery(annoElem);
      const annoId = $annoElem.data('annotationId');

      for (let sibling of siblings) {
        if (sibling['@id'] === annoId) {
          result.push($annoElem);
        }
      }
    }
    return result;
  }

  _getParagraphTag(annotation) {
    const tags = Anno(annotation).tags;
    for (let tag of tags) {
      if (tag.match(/^p\d+$/)) {
        return tag;
      }
    }
    return null;
  }

  _bindScrollEvent() {
    const _this = this;

    this.options.rootElem.scroll(async function(event) {
      const elem = jQuery(this);
      const scrollTop = elem.scrollTop();
      const currentPos = scrollTop + elem.height();
      const contentHeight = this.scrollHeight;

      //logger.debug('contentHeight:', contentHeight, 'scrollTop:', scrollTop, 'scroll bottom:', currentPos);

      if (scrollTop < 20) {
        await _this.pageBack();
      }
      if (contentHeight - currentPos < 20) {
        await _this.pageForward();
      }
    });
  }

  _unbindScrollEvent() {
    this.options.rootElem.off('scroll');
  }

  _bindEvents() {
    this._bindScrollEvent();
  }
}
