import React from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import templates from './templates';
import cytoscape from 'cytoscape';
import klay from 'cytoscape-klay';
import contextMenus from 'cytoscape-context-menus';
import GraphEdit from './GraphEdit';

import axios from 'axios';
import equal from 'fast-deep-equal';
import RefreshIcon from '@mui/icons-material/Refresh';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import SaveIcon from '@mui/icons-material/Save';

import CyStyle from '../public/cy-style.json';
import 'cytoscape-context-menus/cytoscape-context-menus.css';

// TODO: add uncollapse / unselect without complete reload
// will fix the temp solution of freezing the topmost tree
// want to use https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse
// will help with the weird recentering problem with the animation
// looks like it will require changing edge types and classes
cytoscape.use(klay)
cytoscape.use(contextMenus);

/*   Graph view of the data.
    Includes reload, fit to graph, and save current view button.
    Left click to expand node, right click to expand / collapse sidebar of information.
    Right click also gives a context menu to remove elements for visualization purposes. 
*/

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
        topTree: null,
        removed: null,
        downloadUrl: '',
        fileName: 'graph.png',
        selectedElement: null,
        isGraphEditOpen: false
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
    console.log('canvasElements:', this.state.canvasElements);
}

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
        name: 'breadthfirst',
        nodeOverlap: 4,
        directed: true,
        nodeDimensionsIncludeLabels: true,
        refresh: 60,
        animate: true,
        animationDuration: 750,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 40,
        nodeRepulsion: 40000000000000,
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
    console.log('chapterEvent:', chapterEvent);
    console.log('selectedElementId:', selectedElementId);
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
                this.cy.on('tap', event => {
                var eventTarget = event.target;
                //click background
                if (eventTarget === this.cy) {
                    // do nothing
                    // click node, show subtree
                } else if (eventTarget.isNode()) {
                    let node = eventTarget.data();
                    console.log('selectedElement (left-click):', node); // add this line
                    this.showSubTree(node);
                }
                });

            /*    We cannot use elementData here, and in the context menu because it is triggering 
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
                      console.log('selectedElement (right-click menu):', elementData);
                      this.setState({ selectedElement: elementData });
                    },
                  },
                {
                    id: "remove",
                    content: "Remove",
                    selector: "node, edge",
                    onClickFunction: (event) => {
                      const confirmed = window.confirm("Are you sure you want to remove this element?");
                      if (confirmed) {
                        const elementData = event.target.data();
                        console.log("Remove object", elementData);
                        this.removeObject(event);
                        this.removeElementFromSchemaJson(elementData);
                      }
                    },
                  },
                {
                    id: 'add-outlink',
                    content: 'Add Outlink',
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
                            console.log("CLICK ADD CHAPTER")
                            console.log("\n(CANVAS.JSX) Adding chapter event:\n", chapterEvent);
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
                            console.log("\n(CANVAS.JSX) Adding primitive event:\n", primitiveEvent);
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
                            console.log("\n(CANVAS.JSX) Adding XOR event:\n", xorEvent);
                            this.addChapterEvent(xorEvent);
                        }
                    }
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
                        })
                        .catch(err => {
                          console.error(err);
                        });
                      }
                    }
                },
                {
                    id: 'view-entities',
                    content: 'View Entities',
                    selector: 'node[_shape = "diamond"], node[_type = "ellipse"]',
                    onClickFunction: (event) => {
                        /**
                        1. Entities list is displayed on a table.
                        2. User can 'edit' or 'remove' entities from the list.
                        */
                    },
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
                                .then((response) => {
                                  console.log(response);
                                })
                                .catch((error) => {
                                  console.error(error);
                            });
                        });
                    }
                },
                {
                    id: 'add-participant',
                    content: 'Add Participant',
                    selector: 'node[_shape = "ellipse"]',
                    onClickFunction: (event) => {
                        /** 
                        1. Display table of available entities in root node 'entities': [] and selectedElement 'entities': [].
                        2. PARTICIPANT_TEMPLATE is added to selectedElement 'participants': [].
                        3. Participant @id is generated from 'Participants/' + participant_counter + '/' + 'name' (Participants/2xxxx/name).
                        4. Selected 'entity' is set to "entity" field of PARTICIPANT_TEMPLATE.
                        5. Participant 'roleName' is set to 'consult_XPO' (default).

                        PARTICIPANT_TEMPLATE:

                            {
                                "@id": "",
                                "roleName": "consult_XPO",
                                "entity": ""
                            },
                
                        */
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
                          })
                          .catch(err => {
                            console.error(err);
                          });
                        }
                    }
                },
                {
                    id: 'undo',
                    content: 'Undo',
                    onClickFunction: () => {
                        /**
                        1. Undo last action.
                        */     
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
        console.log('selectedElement (componentDidUpdate):', this.props.selectedElement);
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
                maxZoom={2} minZoom={0.87}
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