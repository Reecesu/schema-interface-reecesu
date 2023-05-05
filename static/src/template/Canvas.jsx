import React from 'react';
import axios from 'axios';

import templates from './templates';
import GraphEdit from './GraphEdit';

import klay from 'cytoscape-klay';
import Dagre from 'cytoscape-dagre';
import cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import contextMenus from 'cytoscape-context-menus';
import cytoscapeNavigator from 'cytoscape-navigator';
import CyStyle from '../public/cy-style.json';

import equal from 'fast-deep-equal';
import RefreshIcon from '@mui/icons-material/Refresh';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import SaveIcon from '@mui/icons-material/Save';
import MapIcon from '@mui/icons-material/Map';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import FileCopyIcon from '@mui/icons-material/FileCopy'

import 'cytoscape-context-menus/cytoscape-context-menus.css';
import "cytoscape-navigator/cytoscape.js-navigator.css";

cytoscape.use(Dagre);
cytoscape.use(klay)
cytoscape.use(contextMenus);
cytoscape.use(cytoscapeNavigator);

let event_counter = 20000;
let entity_counter = 10000;
let relation_counter = 30000;
let participant_counter = 20000;

class Canvas extends React.Component {
constructor(props) {
    super(props);
    this.state = {
        canvasElements: CytoscapeComponent.normalizeElements(this.props.elements),
        hasSubtree: false,
        dialogOpen: false,
        topTree: null,
        removed: null,
        downloadUrl: '',
        fileName: 'schema_graph.png',
        selectedElement: null,
        isGraphEditOpen: false,
        isNavigatorVisible: false,
        dialogContent: null,
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
    this.navigatorRef = React.createRef();
    this.graphHistory = [];
    // console.log('canvasElements:', this.state.canvasElements);
}

handleNavigatorToggle = () => {
  this.setState((prevState) => ({
    isNavigatorVisible: !prevState.isNavigatorVisible,
  }));
};

showSidebar(data) {
    this.props.sidebarCallback(data);
}

saveGraphState() {
    this.graphHistory.push(this.cy.json());
}

handleSubmit = () => {
    // perform any actions you want on submit
    // then close the dialog by calling handleClose
    this.setState({ isGraphEditOpen: false });
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

fetchAllEntities = () => {
    axios.get('/get_all_entities')
      .then((response) => {
        this.setState({ allEntities: response.data });
      })
      .catch((error) => {
        console.error(error);
      });
}

  handleDialogClose = () => {
    this.setState({ dialogOpen: false });
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

removeObject(event) {
    const removedElement = event.target;
    const removedData = removedElement.data();
    const newElements = this.state.canvasElements.filter((element) => !equal(element.data, removedData));

    this.setState({
        canvasElements: newElements,
    });

    removedElement.remove();
}

restore() {
    var res = null;
    if (this.state.removed) {
        res = this.state.removed;
        this.setState({ removed: null });
        res.restore();
    }
}

handleOpen() {
    this.setState({ isGraphEditOpen: true });
}

handleClose = () => {
    this.setState({ isGraphEditOpen: false });
}

fitCanvas() {
    this.cy.fit();
}

addChapterEvent = (chapterEvent, selectedElementId) => {
    chapterEvent['parent_id'] = this.state.selectedElement;
    axios.post(`/add_event`, chapterEvent)
      .then((res) => {
        console.log(res.data);
      })
      .catch((error) => {
        console.log(error);
      });
    // console.log('chapterEvent:', chapterEvent);
    // console.log('selectedElementId:', selectedElementId);
};

removeElementFromSchemaJson = (elementData) => {
    axios.post('/remove_node', {
        id: elementData['@id']
    }).then((res) => {
        console.log(res.data);
    }).catch((error) => {
        console.log(error);
    });
};

addOutlink = (fromNodeId, toNodeId) => {
    axios.post('/add_outlink', {
      fromNodeId: fromNodeId,
      toNodeId: toNodeId,
    })
      .then((response) => {
        console.log(response);
        // Add the new edge to the graph
        this.cy.add({
          data: {
            id: `${fromNodeId}-${toNodeId}`,
            source: fromNodeId,
            target: toNodeId,
          },
        });
      })
      .catch((error) => {
        console.error(error);
      });
};

removeEntityFromSchemaJson(entityId) {
    let schemaJson = { ...this.state.schemaJson };
    const events = schemaJson.events;
  
    // Remove entity from participants list in all events
    events.forEach((event) => {
      const participants = event.participants;
      if (participants) {
        event.participants = participants.filter(
          (participant) => participant.entity !== entityId
        );
      }
    });
  
    // Remove entity from entities list
    const entities = schemaJson.events.entities;
    if (entities) {
      schemaJson.events.entities = entities.filter(
        (entity) => entity['@id'] !== entityId
      );
    }
  
    return schemaJson;
  }

  initNavigator() {
    this.cy.navigator({
      container: this.navigatorRef.current,
      viewLiveFramerate: 60,
      thumbnailEventFramerate: 60,
      thumbnailLiveFramerate: false,
      dblClickDelay: 200,
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
            this.initNavigator();
            // left-click 
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

            /*  We cannot use elementData here, and in the context menu because it is triggering 
                the GraphEdit.jsx dialog component early. We need to pass data through selectedElement state without activiating the dialog.
            */

        this.cy.on('cxttap', event => {
        if (event.target.isNode()) {
            if (!event.target.hasClass('context-menu-edit')) {
            // do not set selectedElement
            }
        }
        });

        // right-click menu
        var contextMenu = this.cy.contextMenus({
            menuItems: [
                {
                    id: 'edit-node',
                    content: 'Edit',
                    selector: 'node, edge',
                    classes: 'context-menu-edit',
                    onClickFunction: (event) => {
                      const elementData = event.target.data();
                    //   console.log('selectedElement (right-click menu):', elementData);
                      this.setState({dialogOpen: false, selectedElement: elementData });
                    },
                  },
                  {
                    id: "remove",
                    content: "Remove",
                    selector: "node",
                    onClickFunction: (event) => {
                      const confirmed = window.confirm("Are you sure you want to remove this element?");
                      if (confirmed) {
                        const elementData = event.target.data();
                        const elementId = elementData['@id'];
                        const elementType = event.target.isNode() ? 'node' : 'edge';
                        axios.post('/remove_element', {
                          id: elementId,
                          type: elementType
                        })
                        .then((response) => {
                          console.log(response);
                        })
                        .catch((error) => {
                          console.error(error);
                        });
                      }
                    },
                    // hasTrailingDivider: true
                  },
                {
                    id: 'add-outlink',
                    content: 'Outlink',
                    selector: 'node[_shape = "diamond"], node[_shape = "ellipse"]',
                    onClickFunction: (event) => {
                        // Set the selected node ID to the ID of the node that was right-clicked.
                        this.setState({ selectedNodeId: event.target.id() });
                      
                        // Wait for the user's next click of a node.
                        this.cy.one('select', 'node', (event) => {
                          const selectedNode = event.target;
                          const selectedNodeId = selectedNode.id();
                      
                          // Add the selected node to the outlinks list of the first selected node.
                          this.addOutlink(this.state.selectedNodeId, selectedNodeId);
                      
                          // Make the backend call to add the outlink.
                          axios.post('/add_outlink', {
                            fromNodeId: this.state.selectedNodeId,
                            toNodeId: selectedNodeId,
                          })
                            .then((response) => {
                              console.log(response);
                            })
                            .catch((error) => {
                              console.error(error);
                            });
                        });
                    },
                    hasTrailingDivider: true
                  },
                {
                    id: 'add-chapter-event',
                    content: 'Add Chapter Event',
                    selector: 'node[_shape = "diamond"], node[_type = "gate"]',
                    onClickFunction: (event) => {
                        const elementData = event.target.data();
                        this.setState({ selectedElement: elementData });
                        const eventName = prompt('Enter chapter event name:');
                        if (eventName) {
                            const chapterEvent = {
                                ...templates.chapterEvent,
                                '@id': `Events/${event_counter++}/${eventName}`,
                                'name': eventName
                            };
                            // console.log("CLICK ADD CHAPTER")
                            // console.log("\n(CANVAS.JSX) Adding chapter event:\n", chapterEvent);
                            this.addChapterEvent(chapterEvent);
                        }
                      }
                },
                {
                    id: 'add-primitive-event',
                    content: 'Add Primitive Event',
                    selector: 'node[_shape = "diamond"], node[_type = "gate"]',
                    onClickFunction: (event) => {
                       const elementData = event.target.data();
                        this.setState({ selectedElement: elementData });
                        const eventName = prompt('Enter primitive event name:');
                        if (eventName) {
                            const primitiveEvent = {
                                ...templates.primitiveEvent,
                                '@id': `Events/${event_counter++}/${eventName}`,
                                'name': eventName
                            };
                            // console.log("\n(CANVAS.JSX) Adding primitive event:\n", primitiveEvent);
                            this.addChapterEvent(primitiveEvent);
                        }

                    }
                },
                {
                    id : 'add-xor-event',
                    content: 'Add XOR Gate',
                    selector: 'node[_shape = "diamond"], node[_type = "ellipse"]',
                    onClickFunction: (event) => {
                       const elementData = event.target.data();
                        this.setState({ selectedElement: elementData });
                        const eventName = prompt('Enter XOR gate name:');
                        if (eventName) {
                            const xorEvent = {
                                ...templates.xorGate,
                                '@id': `Events/${event_counter++}/${eventName}`,
                                'name': eventName
                            };
                            // console.log("\n(CANVAS.JSX) Adding XOR event:\n", xorEvent);
                            this.addChapterEvent(xorEvent);
                        }
                    }
                },
                {
                    id: 'add-relation',
                    content: 'Add Relation',
                    selector: 'node[_type = "entity"]',
                    onClickFunction: (event) => {
                            this.setState({ selectedNodeId: event.target.id() });
                          
                            // Wait for the user's next click of a node.
                            this.cy.one('select', 'node', (event) => {
                                const selectedNode = event.target;
                                const selectedNodeId = selectedNode.id();
                                const name = prompt('Enter relation name:');
                                const wd_node = prompt('Enter WikiData node:');
                                const wd_label = prompt('Enter WikiData label:');
                                const wd_description = prompt('Enter WikiData description:');

                                const relation = {
                                    ...templates.relation,
                                    '@id': `Relations/${relation_counter++}/${name}`,
                                    'name': name,
                                    'relationSubject': this.state.selectedNodeId,
                                    'relationObject': selectedNodeId,
                                    'wd_node': wd_node,
                                    'wd_label': wd_label,
                                    'wd_description': wd_description
                                };
                          
                              // Make the backend call to add the outlink.
                              axios.post('/add_relation', {
                                fromNodeId: this.state.selectedNodeId,
                                toNodeId: selectedNodeId,
                                relation: relation
                              })
                                .then((res) => {
                                  console.log(res.data);
                                  props.updateCallback(res.data)
                                })
                                .catch((err) => {
                                  console.error(err);
                            });
                        });
                    }
                },
                {
                    id: 'add-participant',
                    content: 'Add Participant',
                    selector: 'node[_shape = "ellipse"]',
                    onClickFunction: (event) => {
                        const elementData = event.target.data();
                        this.setState({ selectedElement: elementData });
                        const participantName = prompt('Enter participant name:');
                        const participantRoleName = prompt('Enter participant roleName:');
                        const selectedEntity = prompt('Enter an entity:');
                        if (participantName) {
                          const participant = {
                            ...templates.participant,
                            '@id': `Participants/${participant_counter++}/${participantName}`,
                            'roleName': participantRoleName,
                            'entity': selectedEntity
                          };
                        
                          axios.post("/add_participant", {
                            event_id: elementData['@id'],
                            participant_data: participant
                          })
                          .then(res => {
                            console.log("Response from server: ", res.data);
                            props.updateCallback(res.data)
                          })
                          .catch(err => {
                            console.error(err);
                          });
                        }
                    },
                },
                {
                  id: 'add-entity',
                  content: 'Add Entity',
                  selector: 'node[_shape = "diamond"], node[_shape = "ellipse"]',
                  onClickFunction: (event) => {
                    const elementData = event.target.data();
                    this.setState({ selectedElement: elementData });
                    const entityName = prompt('Enter entity name:');
                    const entityWdNode = prompt('Enter entity wd_node:');
                    const entityWdLabel = prompt('Enter entity wd_label:');
                    const entityWdDescription = prompt('Enter entity wd_description:');
                    if (entityName) {
                      const entity = {
                        ...templates.entity,
                        '@id': `Entities/${entity_counter++}/${entityName}`,
                        'name': entityName,
                        'wd_node': entityWdNode,
                        'wd_label': entityWdLabel,
                        'wd_description': entityWdDescription,
                        'event': elementData['@id']
                      };
                    
                      axios.post("/add_entity", {
                        event_id: elementData['@id'],
                        entity_data: entity
                      })
                      .then(res => {
                        console.log("Response from server: ", res.data);
                        props.updateCallback(res.data)
                      })
                      .catch(err => {
                        console.error(err);
                      });
                    }
                  },
                  hasTrailingDivider: true
              },
              {
                id: 'view-entities',
                content: 'View Entities',
                selector: 'node[_shape = "diamond"], node[_shape = "ellipse"]',
                onClickFunction: (event) => {
                  axios.get('/get_all_entities')
                    .then((response) => {
                      let allEntities = response.data;
                      console.log(allEntities);
              
                      // Sort entities by the length of 'participant_in' array in descending order
                      allEntities.sort((a, b) => b['participant_in'].length - a['participant_in'].length);
              
                      const dialogContent = (
                        <div style={{ display: 'inline-block', minWidth: '150vw' }}>
                          <h2>Global Entity Table</h2>
                          <table style={{ borderCollapse: 'collapse', width: '100%', margin: '1em', tableLayout: 'auto' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid black' }}>
                                <th style={{ padding: '0.5em' }}>Entity Name</th>
                                <th style={{ padding: '0.5em' }}>WikiData Label</th>
                                <th style={{ padding: '0.5em' }}>Copy</th>
                                <th style={{ padding: '0.5em' }}>Entity ID</th>
                                <th style={{ padding: '0.5em' }}>Created In</th>
                                <th style={{ padding: '0.5em' }}>Participant In</th>
                              </tr>
                            </thead>
                            <tbody>
                            {allEntities.map((entity) => (
                              <tr key={entity['@id']} style={{ borderBottom: '1px solid black' }}>
                                <td style={{ padding: '0.5em' }}>{entity['name']}</td>
                                <td style={{ padding: '0.5em' }}>{entity['wd_label']}</td>
                                <td style={{ padding: '0.5em' }}>
                                  <IconButton
                                    edge="end"
                                    color="inherit"
                                    onClick={() => {
                                      navigator.clipboard.writeText(entity['@id']).then(
                                        () => console.log('Copied to clipboard:', entity['@id']),
                                        (err) => console.error('Could not copy text:', err)
                                      );
                                    }}
                                  >
                                    <FileCopyIcon />
                                  </IconButton>
                                </td>
                                <td style={{ padding: '0.5em' }}>{entity['@id']}</td>
                                <td style={{ padding: '0.5em' }}>{entity['created_in'].join(', ')}</td>
                                <td style={{ padding: '0.5em' }}>{entity['participant_in'].join(', ')}</td>
                                
                              </tr>
                            ))}
                            </tbody>
                          </table>
                        </div>
                      );
              
                      this.setState({ dialogOpen: true, dialogContent: dialogContent });
                    })
                    .catch((error) => {
                      console.error(error);
                    });
                },
              }
            ],
        });
    });
}

componentDidUpdate(prevProps) {
    if (!equal(this.props.elements, prevProps.elements)) {
        this.reloadCanvas();
    }

    if (this.props.selectedElement !== prevProps.selectedElement) {
        // console.log('selectedElement (componentDidUpdate):', this.props.selectedElement);
        if (this.props.selectedElement) {
            this.setState({ isGraphEditOpen: true });
        } else {
            this.setState({ isGraphEditOpen: false });
        }
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
      left: 40,
      width: 'max-content',
      height: 'max-content',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFF',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)'
    };

    const navigatorStyle = {
      width: "150px",
      height: "150px",
      display: this.state.isNavigatorVisible ? "block" : "none",
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
            <Dialog
              maxWidth='100vw'
              open={this.state.dialogOpen}
              onClose={this.handleDialogClose}
              PaperProps={{
                style: {
                  padding: '20px'
                }
              }}
            >
              {this.state.dialogContent}
            </Dialog>
            <div style={buttonContainer}>
                <RefreshIcon type='button' color="action" fontSize='large' onClick={this.reloadCanvas} />
                <MapIcon type="button" color="action" fontSize="large" onClick={this.handleNavigatorToggle} />
                <AspectRatioIcon type='button' color="action" fontSize='large' onClick={this.fitCanvas} />
                <SaveIcon className="button" type="button" color="action" onClick={this.download} style={{ fontSize: '32px' }}/>
                <a style={{ display: "none" }}
                    download={this.state.fileName}
                    href={this.state.downloadUrl}
                    ref={e => this.dofileDownload = e}
                >download graph image</a>
            </div>
            <div ref={this.navigatorRef} style={navigatorStyle} key={this.state.isNavigatorVisible} />
            <GraphEdit
                selectedElement={this.state.selectedElement}
                handleClose={() => this.setState({ isGraphEditOpen: false })}
                isOpen={this.state.isGraphEditOpen}
                handleOpen={this.handleOpen}
                handleSubmit={this.handleSubmit}
                sideEditorCallback={this.props.sideEditorCallback}
                addChapterEvent={this.props.addChapterEvent}
                />
            </div>
        );
    }
}


export default Canvas;