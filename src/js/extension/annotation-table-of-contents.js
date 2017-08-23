import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import getStateStore from '../state-store';

const logger = getLogger();

export default class AnnotationTableOfContents {
  constructor(options) {
    this.options = Object.assign({
      element: null,
      appendTo: null,
      windowId: null,
      structures: [],
      manifestVersion: null,
      previousSelectedElements: [],
      selectedElements: [],
      previousOpenElements: [],
      openElements: [],
      hoveredElement: [],
      selectContext: null,
      tocData: {},
      active: null,
      eventEmitter: null
    }, options);

    this.init();
  }

  init () {
    const _this = this;
    const tocSpec = getStateStore().getTransient('tocSpec');

    if (!tocSpec) {
      this.element = jQuery(emptyTemplate()).appendTo(this.options.appendTo);
    } else {
      this.element = jQuery(template()).appendTo(this.options.appendTo);
      const topGen = tocSpec.generator[0];

      for (let i = 0; i < topGen.max; ++i) {
        let itemElem = this._createItem(i, tocSpec);
        this.element.append(itemElem);
      }
    }

    this._selectedElem = null;
    this.element.data('AnnotationTableOfContent', this);

    this.element.mousemove(function(event) {
      // To prevent mousemove handler for the annotation overlay from being called
      // -- it must be a bug on the imageview's or annotation layer's side.
      event.stopPropagation();
    });

    this.element.mouseenter(function(event) {
      _this._unselect();
    })
  }

  scrollToTags(tags) {
    logger.debug('AnnotationTableOfContents#scrollToTags tags:', tags);
    const klass = '.' + tags[0];
    const targetElem = this.element.find(klass);

    this._select(targetElem);
    this.element.scrollTo(targetElem, 500);
  }

  _select(elem) {
    this._unselect();
    this._selectedElem = elem;
    elem.addClass('selected');
  }

  _unselect() {
    if (this._selectedElem) {
      this._selectedElem.removeClass('selected');
    }
  }

  _createItem(index, tocSpec) {
    const _this = this;
    const spec = tocSpec.generator[0];
    const tag = spec.tag.prefix + (index + 1);
    const item = jQuery(itemTemplate({
      tag: tag,
      content: spec.descriptions[index]
    }));

    const canvasIds = tocSpec.canvasMap[tag];

    item.click(function(event) {
      const imageWindowId = _this.options.windowId;
      const miradorProxy = getMiradorProxyManager().getMiradorProxyByWindowId(_this.options.windowId);

      miradorProxy.publish('YM_DISPLAY_ON');
      _this._savedScrollTop = _this.element.scrollTop();
      event.preventDefault();
      jQuery(this).focus();
      jQuery.publish('YM_ANNOTATION_TOC_TAGS_SELECTED', [imageWindowId, canvasIds[0], [tag]]);
      setTimeout(() => {
        // In case reload of the image view messes with the scroll of the side panel
        _this.element.scrollTo(_this._savedScrollTop);
      }, 0);
    });
    return item;
  }
}

const template = Handlebars.compile([
  '<div class="ym-annotation-toc">',
  '<h1>Table of Contents</h1>',
  '</div>'
].join(''));

const emptyTemplate = Handlebars.compile([
  '<div class="ym-annotation-toc">',
  'Table of contents is empty',
  '</div>',
].join(''));

const itemTemplate = Handlebars.compile([
  '<div class="ym-annotation-toc-item {{tag}}" tabindex="-1">',
  '<a href="#">{{{content}}}</a>',
  '</div>'
].join(''));
