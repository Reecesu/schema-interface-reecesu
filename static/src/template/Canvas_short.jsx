import React from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import klay from 'cytoscape-klay';
import contextMenus from 'cytoscape-context-menus';
import axios from 'axios';
import equal from 'fast-deep-equal';
import RefreshIcon from '@mui/icons-material/Refresh';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import SaveIcon from '@mui/icons-material/Save';
import CyStyle from '../public/cy-style.json';
import 'cytoscape-context-menus/cytoscape-context-menus.css';

import cytoscapeNavigator from 'cytoscape-navigator';
import 'cytoscape-navigator/css/cytoscape-navigator.css';

import Dagre from 'cytoscape-dagre';

cytoscape.use(Dagre);
cytoscape.use(klay);
cytoscape.use(contextMenus);
cytoscape.use(cytoscapeNavigator);


class Canvas extends React.Component {
constructor(props) {
    super(props);
    this.state = {
        canvasElements: CytoscapeComponent.normalizeElements(this.props.elements),
        hasSubtree: false,
        topTree: null,
        removed: null,
        downloadUrl: '',
        fileName: 'graph.png',
        selectedElement: null,
        isGraphEditOpen: false,
        allEntities: []
    };

    // create topTree
    var treeData = []
    for (var { data: d } of this.state.canvasElements) {
        treeData.push(d);
    };
    this.state.topTree = treeData;

    this.showSidebar = this.showSidebar.bind(this);
    this.showSubTree = this.showSubTree.bind(this);
    this.removeSubTree = this.removeSubTree.bind(this);
    this.runLayout = this.runLayout.bind(this);
    this.reloadCanvas = this.reloadCanvas.bind(this);
    this.removeObject = this.removeObject.bind(this);
    this.restore = this.restore.bind(this);
    this.fitCanvas = this.fitCanvas.bind(this);
    this.download = this.download.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.graphHistory = [];
    this.navigatorRef = React.createRef();
    // console.log('canvasElements:', this.state.canvasElements);
}

showSidebar(data) {
    this.props.sidebarCallback(data);
}

saveGraphState() {
    this.graphHistory.push(this.cy.json());
}

hideSubTree(node) {
  node.hidden = false;
  let subNodes = node.descendants();
  for (let i = 0; i < subNodes.length; i++) {
      subNodes[i].hide();
  }
  this.runLayout();
}

showSubTree(node) {
  axios.get('/node', {
      params: {
          ID: node.id
      }
  })
  .then(res => {
      if (this.state.hasSubtree && this.state.topTree.includes(node)) {
          this.removeSubTree();
      }
      this.setState({ hasSubtree: true });
      this.cy.add(res.data);
      this.runLayout();
  })
  .catch(err => {
      console.error(err);
  })
}

removeSubTree() {
    this.reloadCanvas();
    this.setState({ hasSubtree: false });
}


runLayout() {
  let layout = this.cy.makeLayout({
    name: 'dagre',
    nodeSep: 10,
    edgeSep: 100,
    rankDir: 'LR',
    animate: true,
    animationDuration: 750,
    fit: true,
    padding: 30,
  });
  layout.run();
}

reloadCanvas() {
    this.setState({
        canvasElements: CytoscapeComponent.normalizeElements(this.props.elements),
        hasSubtree: false,
        showParticipants: true
    });
    this.cy.elements().remove();
    this.cy.add(this.state.canvasElements);
    this.runLayout();
}

restore() {
    var res = null;
    if (this.state.removed) {
        res = this.state.removed;
        this.setState({ removed: null });
        res.restore();
    }
}

fitCanvas() {
    this.cy.fit();
}

initNavigator() {
    this.cy.navigator({
      container: this.navigatorRef.current, // Reference to the navigator container
      viewLiveFramerate: 0, // Frame rate to update the navigator view
      thumbnailEventFramerate: 30, // Frame rate to update the thumbnail
      thumbnailLiveFramerate: false, // Disable live updates of the thumbnail
      dblClickDelay: 200, // Delay for double-click events
    });
  }

download(event) {
    event.preventDefault();
    const image = this.cy.png({ output: 'blob', bg: 'white', scale: '1.5' });
    const url = URL.createObjectURL(image);
    this.setState({ downloadUrl: url },
        () => {
            this.dofileDownload.click();
            URL.revokeObjectURL(url);
            this.setState({ downloadUrl: '' })
        })
}

        componentDidMount() {
          this.cy.ready(() => {
            // left-click 
            this.initNavigator();
            this.cy.on('tap', event => {
                var eventTarget = event.target;
                //click background
                if (eventTarget === this.cy) {
                    // do nothing
                    // click node, show subtree
                } else if (eventTarget.isNode()) {
                    let node = eventTarget.data();
                    // console.log('selectedElement (left-click):', node); 
                    this.showSubTree(node);
                }
            });
    });
}

componentDidUpdate(prevProps) {
    if (!equal(this.props.elements, prevProps.elements)) {
        this.reloadCanvas();
    }
}

render() {
    const style = {
        width: 'inherit',
        height: '80vh',
        borderStyle: 'solid',
        position: 'relative'
    };

    const buttonContainer = {
        position: 'absolute',
        top: 185,
        left: 20,
        width: '15px',
        height: '3vh',
        marginLeft: '20px',
    };

    return (
        <div className={this.props.className} style={{ width: 'max-content', display: 'inline-flex' }}>
            <CytoscapeComponent
                elements={this.state.canvasElements}
                layout={CyStyle.layout}
                style={style}
                stylesheet={CyStyle.stylesheet}
                cy={(cy) => { this.cy = cy }}
                maxZoom={3} minZoom={0.77}
            />
            <div style={buttonContainer}>
                <RefreshIcon type='button' color="action" fontSize='large' onClick={this.reloadCanvas} />
                <AspectRatioIcon type='button' color="action" fontSize='large' onClick={this.fitCanvas} />
                <SaveIcon className="button" type="button" color="action" onClick={this.download} />
                <a style={{ display: "none" }}
                    download={this.state.fileName}
                    href={this.state.downloadUrl}
                    ref={e => this.dofileDownload = e}
                >download graph image</a>
            </div>
            </div>
        );
    }
}


export default Canvas;