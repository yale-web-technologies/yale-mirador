import getLogger from '../../util/logger';

const logger = getLogger();

export default class ScrollHelper {
  constructor(options) {
    this._listWidget = options.listWidget;
    this._groupHeaderHeight = options.groupHeaderHeight;

    this._rootElem = this._listWidget.getRootElement();
    this._nav = this._listWidget.getNav();
  }

  /**
   * The page element must have already been loaded for this function to work.
   *
   * @param {number} pageNum
   */
  scrollToPage(pageNum) {
    const pageHeaderElem = this._nav.getPageElement(pageNum).find('.page-header');

    this.unbindScrollEvent();

    return new Promise((resolve, reject) => {
      this._rootElem.scrollTo(pageHeaderElem, {
        onAfter: () => {
          this.bindScrollEvent();
          resolve();
        }
      });
    });
  }

  scrollToTags(targetTags) {
    logger.debug('AnnotationListWidget#scrollToTags targetTags:', targetTags);
    let targetElem = null;

    this._rootElem.find('.annowin_group_header').each((index, value) => {
      const headerElem = jQuery(value);
      let tags = headerElem.data('tags');

      if (!(tags instanceof Array && tags.length > 0)) {
        logger.error('ScrollHelper#scrollToTags invalid tags', tags, 'for header elem', headerElem[0].outerHTML);
        tags = [];
      }

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
      this._rootElem.scrollTo(targetElem.next(), {
        offset: { top: -this._groupHeaderHeight }
      });
    } else {
      logger.warning('AnnotationListWidget#scrollToTags Header element not found for', targetTags);
    }
  }

  scrollToElem(annoElem, yOffsetIn) {
    console.log('yOffsetIn:', yOffsetIn);
    const yOffset = this._calcOffset(annoElem, yOffsetIn);

    this.unbindScrollEvent();

    return new Promise((resolve, reject) => {
      this._rootElem.scrollTo(annoElem, {
        offset: {
          top: yOffset
        },
        onAfter: () => {
          this.bindScrollEvent();
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
    const minOffset = annoElem.height() - this._rootElem.height();
    console.log('minOffset:', minOffset);
    const yOffset = yOffsetIn < minOffset ? minOffset : yOffsetIn;
    console.log('yOffset:', yOffset);
    return yOffset;
  }

  scrollToAnnotation(annotationId, yOffset) {
    logger.debug('AnnotationListWidget#scrollToAnnotation annotationId:', annotationId, 'yOffset:', yOffset);
    for (let annoElem of this._listWidget.getAnnotationElems()) {
      const $annoElem = jQuery(annoElem);
      if ($annoElem.data('annotationId') === annotationId) {
        return this.scrollToElem($annoElem, yOffset);
      }
    }
  }

  scrollDown(delta) {
    this._rootElem.scrollTo('+=' + delta);
  }

  scrollUp(delta) {
    this._rootElem.scrollTo('-=' + delta);
  }

  _windBack() {
    const rootElem = this._rootElem;
    const scrollTop = rootElem.scrollTop();
    const diff = rootElem[0].scrollHeight - rootElem.scrollTop() - rootElem.height();

    if (diff === 0) {
      logger.debug('Winding back');
      this.unbindScrollEvent();
      rootElem.scrollTop(scrollTop - 5);
      this.bindScrollEvent();
    }
  }

   _windForward() {
    logger.debug('_windForward');
    const rootElem = this._rootElem;
    const scrollTop = rootElem.scrollTop();

    if (scrollTop === 0) {
      logger.debug('Winding forward');
      this.unbindScrollEvent();
      rootElem.scrollTop(scrollTop + 5);
      this.bindScrollEvent();
    }
  }

  bindScrollEvent() {
    const _this = this;

    this._rootElem.scroll(async function(event) {
      const listWidget = _this._listWidget;
      const elem = jQuery(this);
      const scrollTop = elem.scrollTop();
      const currentPos = scrollTop + elem.height();
      const contentHeight = this.scrollHeight;

      //logger.debug('contentHeight:', contentHeight, 'scrollTop:', scrollTop, 'scroll bottom:', currentPos);

      if (scrollTop < 20) {
        await listWidget.loadPreviousPage();
      }
      if (contentHeight - currentPos < 20) {
        await listWidget.loadNextPage();
      }
    });
  }

  unbindScrollEvent() {
    this._rootElem.off('scroll');
  }
}
