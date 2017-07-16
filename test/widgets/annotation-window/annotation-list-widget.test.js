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

  it('should render annotations correctly (without ToC)', (done) => {
    const state = {
      getTransient: sinon.stub()
    };
    state.getTransient.withArgs('layerIndexMap').returns({});
    state.getTransient.withArgs('hideTags').returns(true);

    const listWidget = new AnnotationListWidget({
      parentElem: parentElem,
      annotationExplorer: annotationExplorer,
      state: state
    });

    listWidget.render({
      canvasId: '/canvas1',
      layerId: '/layer1'
    }).then(() => {
      expect(parentElem.find('.annowin_anno').size()).to.equal(2);
      done();
    });
  });

  it('should render annotations correctly (with ToC)', (done) => {
    const state = {
      getTransient: sinon.stub()
    };
    state.getTransient.withArgs('layerIndexMap').returns({});
    state.getTransient.withArgs('hideTags').returns(true);

    const listWidget = new AnnotationListWidget({
      parentElem: parentElem,
      annotationExplorer: annotationExplorer,
      state: state
    });

    listWidget.render({
      canvasId: '/canvas1',
      layerId: '/layer1'
    }).then(() => {
      expect(parentElem.find('.annowin_anno').size()).to.equal(2);
      done();
    });
  });

});
