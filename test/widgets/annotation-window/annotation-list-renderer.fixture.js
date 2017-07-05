export default {
  annotationSource: {
    perCanvas: {
      '/canvas1': [
        {
          '@id': '/anno-l1-c1-1',
          on: {
            '@type': 'oa:SpecificResource'
          },
          layerId: '/layer1'
        },
        {
          '@id': '/anno-l1-c1-2',
          on: {
            '@type': 'oa:SpecificResource'
          },
          layerId: '/layer1'
        }
      ],
      '/canvas2': [
        {
          '@id': '/anno-l1-c2-1',
          on: {
            '@type': 'oa:SpecificResource'
          },
          layerId: '/layer1'
        },
        {
          '@id': '/anno-l2-c2-1',
          on: {
            '@type': 'oa:SpecificResource'
          },
          layerId: '/layer2'
        }
      ]
    }
  }
};
