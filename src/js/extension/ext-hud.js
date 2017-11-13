import getLogger from 'util/logger';

(function($) {
  const logger = getLogger();

  $.Hud.prototype.qtipExtra = function(jsonLd) {

    this.element.find('.mirador-osd-previous').each(function() {
      jQuery(this).qtip({
        content: {
          text: jQuery(this).attr('title'),
        },
        position: {
          my: 'bottom left',
          at: 'top left'
        },
        style: {
          classes: 'qtip-dark qtip-shadow qtip-rounded',
          tip: false
        }
      });
    });
    this.element.find('.mirador-osd-next').each(function() {
      jQuery(this).qtip({
        content: {
          text: jQuery(this).attr('title'),
        },
        position: {
          my: 'bottom right',
          at: 'top right'
        },
        style: {
          classes: 'qtip-dark qtip-shadow qtip-rounded',
          tip: false
        }
      });
    });
  };

  $.Hud.prototype.toggleBottomPanelQtip = function(bottomPanelVisible) {
    const title = bottomPanelVisible ?
      i18next.t('hideBottomPanel') : i18next.t('showBottomPanel');
    const elem = this.element.find('.mirador-osd-toggle-bottom-panel');

    if (!this._bottomPanelQtipInitialized) {
      elem.each(function() {
        jQuery(this).qtip({
          content: {
            text: title
          },
          position: {
            my: 'bottom center',
            at: 'top center',
            adjust: {
              method: 'shift',
              y: 10
            }
          },
          style: {
            classes: 'qtip-dark qtip-shadow qtip-rounded'
          }
        });
      });
      this._bottomPanelQtipInitialized = true;
    } else {
      elem.qtip('option', 'content.text', title);
    }
  };

})(Mirador);
