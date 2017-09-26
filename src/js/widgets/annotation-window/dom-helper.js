export default {

  findAnnoListElem: rootElem => {
    return rootElem.find('.annowin_list');
  },

  /**
   * Return true if the element is an annotation cell, as opposed to a header
   */
  isAnnotationCell: elem => {
    return elem.hasClass('annowin_anno');
  },

  findAnnoElemByAnnoId: (annoId, $rootElem) => {
    let $foundElem = null;
    $rootElem.find('.annowin_anno').each((index, elem) => {
      if (jQuery(elem).data('annotationId') === annoId) {
        $foundElem = jQuery(elem);
        return false;
      }
    });
    return $foundElem;
  }
};
