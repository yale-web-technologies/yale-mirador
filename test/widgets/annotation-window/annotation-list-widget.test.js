import {expect} from 'chai';
import {AnnotationExplorer} from '../../../src/js/import';
import AnnotationListWidget from '../../../src/js/widgets/annotation-window/annotation-list-widget';

import '../../test-helpers/test-init';
import fixture from './annotation-list-widget.fixture';
import TestAnnotationSource from '../../test-helpers/test-annotation-source';

describe('AnnotationListWidget', () => {

  let parentElem = null;
  let annotationExplorer = null;
  const annotationSource = new TestAnnotationSource({
    fixture: fixture.annotationSource
  });

  beforeEach(function() {
    const body = jQuery(document.body);
    parentElem = jQuery('<div/>')
      .addClass('annowin_list');

    body.empty();
    body.append(parentElem);

    annotationExplorer = new AnnotationExplorer({
      dataSource: annotationSource
    });
  });

  xit('should render annotations correctly (without ToC)', (done) => {

  });

  xit('should render annotations correctly (with ToC)', (done) => {
  });

});
