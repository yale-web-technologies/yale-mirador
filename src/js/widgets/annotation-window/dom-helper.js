export default {

  findAnnoListElem: rootElem => {
    return rootElem.find('.annowin_list');
  },

  /**
   * Return true if the element is an annotation cell, as opposed to a header
   */
  isAnnotationCell: elem => {
    return elem.hasClass('annowin_anno');
  }
};
