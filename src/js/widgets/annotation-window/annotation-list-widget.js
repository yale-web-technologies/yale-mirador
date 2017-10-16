import AnnotationNav from './annotation-nav';
import AnnotationPageRenderer from './renderer/annotation-page-renderer';
import {Anno, AnnotationToc, annoUtil} from '../../import';
import getApp from '../../app';
import getLogger from '../../util/logger';
import getStateStore from '../../state-store';
import ScrollHelper from './scroll-helper';

const logger = getLogger();

/**
 * Scrollable list of annotations in an AnnotationWindow
 */
export default class AnnotationListWidget {
  constructor(options) {
    this._annoWin = options.annotationWindow; // annotation window to which this widget belongs
    this._rootElem = options.rootElem; // root HTML element for this list widget
    this._annoPageRenderer = options.annotationPageRenderer;
    this._annoExplorer = options.annotationExplorer;
    this._canvases = options.canvases;
    this._state = options.state;
    this._isEditor = options.isEditor;
    this._continousPages = options.continuousPages;

    this._minContentRelativeHeight = 1.5;
    this._maxContentRelativeHeight = 5;

    if (!this._state) {
      this._state = getStateStore();
    }

    if (!this._annoPageRenderer) {
      this._annoPageRenderer = new AnnotationPageRenderer({
        annotationWindow: this._annoWin,
        annotationExplorer: this._annoExplorer
      });
    }

    this._tocSpec = this._state.getTransient('tocSpec');
  }

  getRootElement() {
    return this._rootElem;
  }

  reload(layerId) {
    this._layerId = layerId;
    this._nav = this._setupNavigation();
    this._loading = false;
    this._rootElem.empty();
    this._createPageElements();
    this._scrollHelper = new ScrollHelper({
      listWidget: this,
      listNavigator: this._nav,
      groupHeaderHeight: 19,
      continuousPages: this._continousPages
    });
    this._unbindEvents();
    this._bindEvents();
  }

  _setupNavigation() {
    const nav = new AnnotationNav({
      canvases: this._canvases
    });
    return nav;
  }

  getNav() {
    return this._nav;
  }

  async goToPage(pageNum) {
    logger.debug('AnnotationListWidgetr#goToPage', pageNum, 'from', this._nav.getPage());
    if (pageNum !== this._nav.getPage()) {
      this._nav.setPage(pageNum);
      await this._onNavSetPage(pageNum).catch(reason => {
        throw 'AnnotationListWidget#goToPage _onNavSetPage(' + pageNum + ') failed: ' + reason;
      });
    }
  }

  async goToPageByCanvas(canvasId) {
    logger.debug('AnnotationListWidgetr#goToPageByCanvas canvasId:', canvasId);
    const pageNum = this._nav.getPageNumForCanvas(canvasId);
    await this.goToPage(pageNum).catch(reason => {
      throw 'AnnotationListWidget#goToPageByCanvas: goToPage(' + pageNum + ') failed: ' + reason;
    });
  }

  async goToPageByTags(tags) {
    logger.debug('AnnotationListWidgetr#goToPageByTags', tags);
    const canvasIds = this._tocSpec.canvasMap[tags[0]];
    if (canvasIds instanceof Array && canvasIds.length > 0) {
      await this.goToPageByCanvas(canvasIds[0]);
      this._scrollHelper.scrollToTags(tags);
    }
  }

  async goToAnnotation(annoId, canvasId) {
    logger.debug('AnnotationListWidget#goToAnnotation annoId', annoId, 'canvasId:', canvasId);

    const nav = this._nav;
    const targetPage = nav.getPageNumForCanvas(canvasId);

    if (targetPage >= 0) {
      await this.goToPage(targetPage);

      this._scrollHelper.scrollToAnnotation(annoId);
      this.clearAnnotationHighlights();
      this.highlightAnnotation(annoId, 'SELECTED');
    } else {
      logger.debug('AnnotationListWidget#goToAnnotation page not found for canvasId', canvasId);
    }
  }

  async _onNavSetPage(pageNum) {
    logger.debug('AnnotationListWidget#_onNavSetPage pageNum:', pageNum);
    const canvas = this._nav.getCanvas(pageNum);
    const oldCanvasId = this._annoWin.getCurrentCanvasId();
    const newCanvasId = canvas['@id'];

    if (!this._nav.isLoaded(pageNum)) {
      this._unloadAllPages();
      await this._loadPage(pageNum).catch(reason => {
        throw 'AnnotationListWidget#_onNavSetPage _loadPage(' + pageNum + ') failed: ' + reason;
      });
    }

    if (this._continousPages) {
      await this.loadPreviousPage();
      await this.loadNextPage();
      await this._scrollHelper.scrollToPage(pageNum);
    }

    if (oldCanvasId !== newCanvasId) { // if the focused annotation belongs to a different canvas
      // Load new canvas in the image window
      this._annoWin.getImageWindowProxy().setCurrentCanvasId(newCanvasId);
    }
  }

  // Load next page if there is one
  async loadNextPage() {
    logger.debug('AnnotationListWidget#loadNextPage loading:', this._loading);
    try {
      if (this._loading) {
        return;
      }
      this._loading = true;
      const nextPage = this._nav.getActiveRange().endPage + 1;
      if (nextPage < this._nav.getNumPages()) {
        await this._loadPage(nextPage);
        this._scrollHelper.scrollDown(30);
      }
    } catch (e) {
      logger.error('AnnotationListWidget#loadNextPages failed', e);
    } finally {
      this._loading = false;
    }
  }

  // Load previous page if there is one
  async loadPreviousPage() {
    logger.debug('AnnotationListWidget#loadPreviousPage loading:', this._loading);
    try {
      if (this._loading) {
        return;
      }
      this._loading = true;
      const nextPage = this._nav.getActiveRange().startPage - 1;
      if (nextPage >= 0) {
        await this._loadPage(nextPage);
        this._scrollHelper.scrollUp(30);
      }
    } catch (e) {
      logger.error('AnnotationListWidget#loadNextPages failed', e);
    } finally {
      this._loading = false;
    }
  }

  // Load next pages until minimum content height is reached
  async LoadNextPages() {
    logger.debug('AnnotationListWidget#loadNextPages loading:', this._loading);
    try {
      if (this._loading) {
        return;
      }
      this._loading = true;
      const minHeight = this._rootElem.height() * this._minContentRelativeHeight;
      const numPages = this._nav.getNumPages();
      let scrollHeight = this._rootElem[0].scrollHeight;

      for (let nextPage = this._nav.getActiveRange().endPage + 1;
        nextPage < numPages && scrollHeight < minHeight;
        scrollHeight = this._rootElem[0].scrollHeight, ++nextPage)
      {
        logger.debug('AnnotationListWidget#loadNextPages nextPage:', nextPage, 'numPages:', numPages, 'scrollHeight:', scrollHeight, 'minHeight:', minHeight);
        await this._loadPage(nextPage);
      }
    } catch (e) {
      logger.error('AnnotationListWidget#loadNextPages failed', e);
    } finally {
      this._loading = false;
    }
  }

  // Load next pages until minimum content height is reached
  async loadPreviousPages() {
    logger.debug('AnnotationListWidget#loadPreviousPages', this._loading);
    try {
      if (this._loading) {
        return;
      }
      this._loading = true;
      const minHeight = this._rootElem.height() * this._minContentRelativeHeight;
      const numPages = this._nav.getNumPages();
      let scrollHeight = this._rootElem[0].scrollHeight;

      for (let nextPage = this._nav.getActiveRange().startPage - 1;
        nextPage >= 0 && scrollHeight < minHeight;
        scrollHeight = this._rootElem[0].scrollHeight, --nextPage)
      {
        logger.debug('AnnotationListWidget#_loadPreviousPages nextPage:', nextPage, 'scrollHeight:', scrollHeight, 'minHeight:', minHeight);
        await this._loadPage(nextPage);
      }
    } catch (e) {
      logger.error('AnnotationListWidget#loadPreviousPages failed', e);
    } finally {
      this._loading = false;
    }
  }

  select(annoElem) {
    this.clearAnnotationHighlights();
    this._nav.setPageByCanvasId(annoElem.data('canvasId'));

    annoElem.focus();

    jQuery.publish('ANNOWIN_ANNOTATION_FOCUSED', [{
      annotationWindowId: this._annoWin.getId(),
      annotation: annoElem.data('annotation'),
      canvasId: annoElem.data('canvasId'),
      imageWindowId: this._annoWin.getImageWindowId(),
      offset: annoElem.position().top
    }]);
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
    const pageRenderer = this._annoPageRenderer;

    for (let pageNum = 0; pageNum < this._canvases.length; ++pageNum) {
      let canvas = nav.getCanvas(pageNum);
      let pageElem = pageRenderer.createPageElement({
        pageNum: pageNum,
        canvasId: canvas['@id'],
        canvasLabel: canvas.label,
        layerId: this._layerId
      });

      this._rootElem.append(pageElem);
      pageElem.hide();
      nav.setPageElement(pageNum, pageElem);
    }
  }

  async _activateMorePagesForward(pageNum, numPages) {
    logger.debug('AnnotationListWidget#_activateMorePagesForward', pageNum, numPages);
    const rootElem = this._rootElem;
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
    const rootElem = this._rootElem;
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

  async _loadPage(pageNum) {
    logger.debug('AnnotationListWidget#_loadPage pageNum:', pageNum);

    if (this._nav.isLoaded(pageNum)) {
      logger.debug('AnnotationListWidget#_loadPage alread loaded; page:', pageNum);
      return;
    }

    const annotations = await this._getAnnotationsForPage(pageNum);
    const toc = await this._getTocForPage(pageNum);
    const element = this._nav.getPageElement(pageNum);

    this._nav.load(pageNum, annotations, toc);

    this._annoPageRenderer.render(element, {
      annotations: annotations,
      annotationToc: toc,
      isEditor: this._isEditor,
      pageNum: pageNum
    });

    element.show();
  }

  _unloadAllPages() {
    for (let elem of this._nav.getPageElements()) {
      elem.hide();
    }
    this._nav.unloadAll();
  }

  _unloadNextPages() {
    logger.debug('AnnotationListWidget#_unloadNextPages');
    const nav = this._nav;
    const rootElem = this._rootElem;
    const rootElemHeight = rootElem.height();
    const maxHeight = this._maxContentRelativeHeight * rootElemHeight;

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
    const rootElem = this._rootElem;
    const rootElemHeight = rootElem.height();
    const maxHeight = this._maxContentRelativeHeight * rootElemHeight;

    for (let nextPage = 0;
         nextPage < this._currentPageNum - 1 && rootElem[0].scrollHeight - rootElemHeight > maxHeight;
         ++nextPage)
    {
      logger.debug('AnnotationListWidget#_unloadPreviousPages nextPage:', nextPage, 'scroll height:', rootElem[0].scrollHeight, 'maxHeight:', maxHeight);
      nav.getPageElement(nextPage).hide();
    }
  }

  async _getTocForPage(pageNum) {
    const canvas = this._nav.getCanvas(pageNum);
    const tocCache = getApp().getAnnotationTocCache();
    return tocCache ? await tocCache.getToc(canvas['@id']) : null;
  }

  async _getAnnotationsForPage(pageNum) {
    const canvasId = this._nav.getCanvas(pageNum)['@id'];
    const annotations = await this._annoExplorer.getAnnotations({
      canvasId: canvasId
    });
    return annotations.filter(anno => anno.layerId === this._layerId);
  }

  clearHighlights() {
    this._rootElem.find('.annowin_anno').each((index, value) => {
      jQuery(value).removeClass('annowin_targeted')
        .removeClass('ym_anno_selected ym_anno_targeting ym_anno_targeted');
    });
  }

  getAnnotationElems() {
    return this._rootElem.find('.annowin_anno').toArray();
  }

  /**
   * Find annotation's siblings from annotations
   * A sibling is an annotation that points to the same TOC node.
   * For example, annotation A and B are siblings if they both belong to
   * ["chapter1", "scene2", "p1"].
   */
  getTocSiblingElems(annotation, annotations, layerId, toc) {
    logger.debug('AnnotationListWidget#getTocSiblingElems annotation:', annotation, 'annotations:', annotations, 'layerId:', layerId, 'toc:', toc);
    const result = [];
    let siblings = annoUtil.findTocSiblings(annotation, annotations, layerId, toc);

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

   async _focusNextAnnotation() {
    const nav = this._nav;
    const current = jQuery(this._rootElem.find('.annowin_anno:focus'));
    let next = current.next();
    while (next.size() > 0 && !next.hasClass('annowin_anno')) {
      next = next.next();
    }
    if (next.size() > 0) {
      this.select(next);
    } else {
      const nextPage = nav.getPage() + 1;
      if (nextPage < nav.getNumPages()) {
        if (!nav.isLoaded(nextPage)) {
          await this.loadNextPage();
        }
        const nextPageElem = nav.getPageElement(nextPage);
        next = nextPageElem.find('.annowin_anno').first();
        if (next) {
          this.select(next);
          nav.setPage(nextPage);
        }
      }
    }
  }

  async _focusPrevAnnotation() {
    const nav = this._nav;
    const current = jQuery(this._rootElem.find('.annowin_anno:focus'));
    let prev = current.prev();

    while (prev.size() > 0 && !prev.hasClass('annowin_anno')) {
      prev = prev.prev();
    }
    if (prev.size() > 0) {
      this.select(prev);
    } else {
      const prevPage = nav.getPage() - 1;
      if (prevPage >= 0) {
        if (!nav.isLoaded(prevPage)) {
          await this.loadPreviousPage();
        }
        const prevPageElem = nav.getPageElement(prevPage);
        prev = prevPageElem.find('.annowin_anno').last();
        if (prev) {
          this.select(prev);
          nav.setPage(prevPage);
        }
      }
    }
  }

  scrollToElem(annoElem, yOffset) {
    this._scrollHelper.scrollToElem(annoElem, yOffset);
  }

  scrollToAnnotation(annoId, yOffset) {
    this._scrollHelper.scrollToAnnotation(annoId, yOffset);
  }

  _bindEvents() {
    const _this = this;
    this._scrollHelper.bindScrollEvent();

    this._rootElem.keydown(function(event) {
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
    this._scrollHelper.unbindScrollEvent();
    this._rootElem.off('keydown');
  }
}
