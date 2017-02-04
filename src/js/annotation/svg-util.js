export default {
  mergeSvgs: function(svg1, svg2) {
    const parser = new DOMParser();
    const doc1 = parser.parseFromString(svg1, 'application/xml');
    const doc2 = parser.parseFromString(svg2, 'application/xml');
    const svgNode1 = doc1.documentElement;
    const svgNode2 = doc2.documentElement;

    if (svgNode1.tagName !== 'svg' || svgNode2.tagName !== 'svg') {
      throw '<svg> not found';
    }

    const firstChild1 = svgNode1.childNodes[0];
    const pathNodes1 = this.getSvgPathNodes(svgNode1);
    const pathNodes2 = this.getSvgPathNodes(svgNode2);
    let group = null;
    
    if (firstChild1.tagName === 'g') {
      group = firstChild1;
      for (let pathNode of pathNodes2) {
        group.appendChild(pathNode);
      }
    } else if (firstChild1.tagName === 'path') {
      group = doc1.createElement('g');
      for (let pathNode of pathNodes1.concat(pathNodes2)) {
        group.appendChild(pathNode);
      }
      while (svgNode1.firstChild) {
        svgNode1.removeChild(svgNode1.firstChild);
      }
      svgNode1.appendChild(group);
    } else {
      throw '<g> or <path> not found';
    }
    const svg = new XMLSerializer().serializeToString(doc1.documentElement);
    return svg;
  },
  
  getSvgPathNodes: function(svgNode) {
    const topChildren = svgNode.childNodes;
    let pathNodes = [];
    
    if (topChildren.length !== 1) {
      throw '<svg> has more than one children';
    }
    
    const topChild = topChildren[0];
    
    if (topChild.tagName === 'g') {
      for (let childNode of topChild.childNodes) {
        if (childNode.tagName === 'path') {
          pathNodes.push(childNode);
        } else {
          console.log('Error svgUtil.getSvgPathNodes expected <svg> but found <' + childNode.tagName + '>');
        }
      }
    } else if (topChild.tagName === 'path') {
      pathNodes.push(topChild);
    } else {
      throw 'Child of <svg> should be <g> or <path> but found <' + topChild.tagName + '>';
    }
    
    return pathNodes;
  }
  
};