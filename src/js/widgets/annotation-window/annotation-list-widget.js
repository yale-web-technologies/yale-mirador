import AnnotationNav from './annotation-nav';
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

    this._annoWin = this.options.annotationWindow;
    this._tocSpec = this.options.state.getTransient('tocSpec');
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

  getRootElement() {
    return this.options.rootElem;
  }

  reload(layerId) {
    this._nav = this._setupNavigation();
    this._loading = false;

    if (layerId) {
      this.options.layerId = layerId;
    }
    this.options.rootElem.empty();
    this._createPageElements();
    this._unbindEvents();
    this._bindEvents();
  }

  _setupNavigation() {
    const nav = new AnnotationNav({
      canvases: this.options.canvases
    });
    return nav;
  }

  getNav() {
    return this._nav;
  }

  async _onSetPage(pageNum, canvas) {
    logger.debug('AnnotationListWidget#_onSetPage pageNum:', pageNum, 'canvas:', canvas);
    const rootElem = this.options.rootElem;
    const oldCanvasId = this._annoWin.getCurrentCanvasId();
    const newCanvasId = canvas['@id'];

    if (!this._nav.isLoaded(pageNum)) {
      this._unloadAllPages();
      await this._loadPage(pageNum);
    }

    if (rootElem[0].scrollHeight <= rootElem.height()) {
      //await this._activateMorePagesForwardFirst(pageNum);
    }
    await this.scrollToPage(pageNum, true);

    if (oldCanvasId !== newCanvasId) {
      this._annoWin.getImageWindowProxy().setCurrentCanvasId(newCanvasId, {
        eventOriginatorType: 'AnnotationWindow'
      });
    }
  }

  async goToPage(pageNum) {
    logger.debug('AnnotationListWidgetr#goToPage', pageNum, 'from', this._nav.getPage());
    if (pageNum !== this._nav.getPage()) {
      this._nav.setPage(pageNum);
      await this._onSetPage(pageNum, this._nav.getCanvas(pageNum));
    }
  }

  async goToPageByCanvas(canvasId) {
    logger.debug('AnnotationListWidgetr#goToPageByCanvas', canvasId);
    const pageNum = this._nav.getPageNumForCanvas(canvasId);
    await this.goToPage(pageNum);
  }

  async goToPageByTags(tags) {
    logger.debug('AnnotationListWidgetr#goToPageByTags', tags);
    const canvasIds = this._tocSpec.canvasMap[tags[0]];
    if (canvasIds instanceof Array && canvasIds.length > 0) {
      await this.goToPageByCanvas(canvasIds[0]);
      this.scrollToTags(tags);
    }
  }

  async loadNextPages() {
    logger.debug('AnnotationListWidget#loadNextPages', this._loading);
    if (this._loading) {
      return;
    }
    this._loading = true;
    const nav = this._nav;

    try {
      const pageNum = nav.getActiveRange().endPage + 1;

      if (pageNum < nav.getNumPages()) {
        let nextPage = await this._activatePageForward(pageNum);
        if (nextPage < nav.getNumPages()) {
          nextPage = await this._activateMorePagesForwardFirst(nextPage);
        }
        this._unloadPreviousPages();
        this._windBack();
      }
    } catch (e) {
      logger.error('AnnotationListWidget#loadNextPages failed', e);
    } finally {
      this._loading = false;
    }
  }

  async loadPreviousPages() {
    logger.debug('AnnotationListWidget#loadPreviousPages', this._loading);
    if (this._loading) {
      return;
    }
    this._loading = true;
    const nav = this._nav;

    try {
      const pageNum = nav.getActiveRange().startPage - 1;

      if (pageNum >= 0) {
        const nextPage = await this._activatePageBackward(pageNum);
        if (nextPage !== -1) {
          await this._activateMorePagesBackwardFirst(nextPage);
        }
        this._unloadNextPages();
        this._windForward();
      }
      this._loading = false;
    } catch (e) {
      logger.error('AnnotationListWidget#loadPreviousPages failed', e);
    } finally {
      this._loading = false;
    }
  }

  async goToAnnotation(annoId, canvasId) {
    logger.debug('AnnotationListWidget#goToAnnotation annoId', annoId, 'canvasId:', canvasId);

    const nav = this._nav;
    const targetPage = nav.getPageNumForCanvas(canvasId);

    if (targetPage >= 0) {
      await this.goToPage(targetPage);

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
    const pageHeaderElem = this._nav.getPageElement(pageNum).find('.page-header');

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

  scrollToTags(targetTags) {
    logger.debug('AnnotationListWidget#scrollToTags targetTags:', targetTags);
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
    console.log('targetElem:', targetElem[0].outerHTML);
    if (targetElem) {
      this.options.rootElem.scrollTo(targetElem.next(), {
        offset: { top: -this._groupHeaderHeight }
      });
    } else {
      logger.warning('AnnotationListWidget#scrollToTags Header element not found for', targetTags);
    }
  }

  scrollToElem(annoElem, yOffsetIn) {
    console.log('yOffsetIn:', yOffsetIn);
    const yOffset = this._calcOffset(annoElem, yOffsetIn);

    this._unbindScrollEvent();

    return new Promise((resolve, reject) => {
      this.options.rootElem.scrollTo(annoElem, {
        offset: {
          top: yOffset
        },
        onAfter: () => {
          this._bindScrollEvent();
          resolve();
        }
      });
    });
  }

  // Note to avoid confusion: yOffsetIn will typically have a negative value if defined
  _calcOffset(annoElem, yOffsetIn) {
    if (yOffsetIn === undefined) {
      return -this._groupHeaderHeight;
    }
    const minOffset = annoElem.height() - this.options.rootElem.height();
    console.log('minOffset:', minOffset);
    const yOffset = yOffsetIn < minOffset ? minOffset : yOffsetIn;
    console.log('yOffset:', yOffset);
    return yOffset;
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

  /**
   * Create empty page elements under the root.
   */
  _createPageElements() {
    logger.debug('AnnotationListWidget#_createPageElements');
    const nav = this._nav;
    const pageRenderer = this.options.annotationPageRenderer;

    for (let pageNum = 0; pageNum < this.options.canvases.length; ++pageNum) {
      let canvas = nav.getCanvas(pageNum);
      let pageElem = pageRenderer.createPageElement({
        pageNum: pageNum,
        canvasId: canvas['@id'],
        canvasLabel: canvas.label,
        layerId: this.options.layerId
      });

      this.options.rootElem.append(pageElem);
      pageElem.hide();
      nav.setPageElement(pageNum, pageElem);
    }
  }

  async _activatePageForward(pageNum) {
    await this._loadPage(pageNum);
    let nextPage = pageNum;

    if (pageNum < this._nav.getNumPages() - 1) {
      ++nextPage;
      await this._loadPage(nextPage);
    }
    return nextPage;
  }

  async _activatePageBackward(pageNum) {
    await this._loadPage(pageNum);
    let nextPage = pageNum;

    if (pageNum > 0) {
      --nextPage;
      await this._loadPage(nextPage);
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
    this._nav.getPageElement(pageNum).hide();
    this._nav.unload(pageNum);
  }

  _unloadNextPages() {
    logger.debug('AnnotationListWidget#_unloadNextPages');
    const nav = this._nav;
    const rootElem = this.options.rootElem;
    const rootElemHeight = rootElem.height();
    const maxHeight = this.options.maxContentRelativeHeight * rootElemHeight;

    for (let nextPage = nav.getActiveRange().endPage;
         nextPage > nav.getPage() + 1 && rootElem[0].scrollHeight - rootElemHeight > maxHeight;
         --nextPage)
    {
      logger.debug('AnnotationListWidget#_deactivatePagesBackward nextPage:', nextPage, 'scroll height:', rootElem[0].scrollHeight, 'maxHeight:', maxHeight);
      nav.getPageElement(nextPage).hide();
    }
  }

  _unloadPreviousPages() {
    logger.debug('AnnotationListWidget#_unloadPreviousPages');
    const rootElem = this.options.rootElem;
    const rootElemHeight = rootElem.height();
    const maxHeight = this.options.maxContentRelativeHeight * rootElemHeight;

    for (let nextPage = 0;
         nextPage < this._currentPageNum - 1 && rootElem[0].scrollHeight - rootElemHeight > maxHeight;
         ++nextPage)
    {
      logger.debug('AnnotationListWidget#_unloadPreviousPages nextPage:', nextPage, 'scroll height:', rootElem[0].scrollHeight, 'maxHeight:', maxHeight);
      nav.getPageElement(nextPage).hide();
    }
  }

  _unloadAllPages() {
    for (let elem of this._nav.getPageElements()) {
      elem.hide();
    }
    this._nav.unloadAll();
  }

  async _loadPage(pageNum) {
    logger.debug('AnnotationListWidget#_loadPage pageNum:', pageNum);
    const nav = this._nav;

    if (nav.isLoaded(pageNum)) {
      return;
    }

    getModalAlert().show('Loading');

    const canvasId = nav.getCanvas(pageNum)['@id'];
    let annotations = await this.options.annotationExplorer.getAnnotations({
      canvasId: canvasId
    });
    annotations = annotations.filter(anno => anno.layerId === this.options.layerId);
    const tocCache = getApp().getAnnotationTocCache();
    const toc = tocCache ? await tocCache.getToc(canvasId) : null;
    const element = nav.getPageElement(pageNum);

    nav.load(pageNum, annotations, toc);

    this.options.annotationPageRenderer.render(element, {
      annotations: annotations,
      annotationToc: toc,
      isEditor: this.options.isEditor,
      pageNum: pageNum
    });
    element.show();
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

  async _focusNextAnnotation() {
    const nav = this._nav;
    const current = jQuery(this.options.rootElem.find('.annowin_anno:focus'));
    let next = current.next();
    while (next.size() > 0 && !next.hasClass('annowin_anno')) {
      next = next.next();
    }
    if (next.size() > 0) {
      next.focus();
    } else {
      const nextPage = nav.getPage() + 1;
      if (nextPage < nav.getNumPages()) {
        if (!nav.isLoaded(nextPage)) {
          await this.loadNextPages();
        }
        const nextPageElem = nav.getPageElement(nextPage);
        next = nextPageElem.find('.annowin_anno').first();
        if (next) {
          next.focus();
          nav.setPage(nextPage);
        }
      }
    }
  }

  async _focusPrevAnnotation() {
    const nav = this._nav;
    const current = jQuery(this.options.rootElem.find('.annowin_anno:focus'));
    let prev = current.prev();

    while (prev.size() > 0 && !prev.hasClass('annowin_anno')) {
      prev = prev.prev();
    }
    if (prev.size() > 0) {
      prev.focus();
    } else {
      const prevPage = nav.getPage() - 1;
      if (prevPage >= 0) {
        if (!nav.isLoaded(prevPage)) {
          await this.loadPreviousPages();
        }
        const prevPageElem = nav.getPageElement(prevPage);
        prev = prevPageElem.find('.annowin_anno').last();
        if (prev) {
          prev.focus();
          nav.setPage(prevPage);
        }
      }
    }
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
        await _this.loadPreviousPages();
      }
      if (contentHeight - currentPos < 20) {
        await _this.loadNextPages();
      }
    });
  }

  _unbindScrollEvent() {
    this.options.rootElem.off('scroll');
  }

  _bindEvents() {
    const _this = this;
    this._bindScrollEvent();

    this.options.rootElem.keydown(function(event) {
      event.preventDefault();
      switch (event.key) {
        case 'ArrowDown':
          _this._focusNextAnnotation();
          break;
        case 'ArrowUp':
          _this._focusPrevAnnotation();
          break;
      }
    });
  }

  _unbindEvents() {
    this._unbindScrollEvent();
    this.options.rootElem.off('keydown');
  }
}
