import React from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';

import templates from './templates';
import GraphEdit from './GraphEdit';
import AddParticipantDialog from './AddParticipant';
import AddEventDialog from './AddEvent';
import AddRelationDialog from './AddRelation';
import AddEntityDialog from './AddEntity';
import AddXORDialog from './AddXOR';

import klay from 'cytoscape-klay';
import Dagre from 'cytoscape-dagre';
import cytoscape from 'cytoscape';
import Tooltip from '@mui/material/Tooltip';
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
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@material-ui/icons/Close';
import Button from '@material-ui/core/Button';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import Typography from '@mui/material/Typography';

import 'cytoscape-context-menus/cytoscape-context-menus.css';
import "cytoscape-navigator/cytoscape.js-navigator.css";

cytoscape.use(Dagre);
cytoscape.use(klay)
cytoscape.use(contextMenus);
cytoscape.use(cytoscapeNavigator);

let event_counter = 20000;
let entity_counter = 10000;
let relation_counter = 30000;

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
        event_counter: 20000,
        entity_counter: 10000,
        participant_counter: 20000,
        isAddEntityDialogOpen: false,
        isAddParticipantDialogOpen: false,
        addRelationDialogOpen: false,
        addEventDialogOpen: false,
        isAddXORDialogOpen: false,
        selectedElementForAddRelation: null,
        selectedElementForAddParticipant: null,
        selectedElementForAddEntity: null,
        selectedElementForAddEvent: null,
        selectedElementForAddXOR: null,
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

resetSelectedElement = () => {
  this.setState({ selectedElement: null });
};

handleNavigatorToggle = () => {
  this.setState((prevState) => ({
      isNavigatorVisible: !prevState.isNavigatorVisible
  }), () => {
    if (this.state.isNavigatorVisible) {
      setTimeout(() => {
        this.initNavigator();
      }, 250);
    } else if (this.navigator) {
      this.navigator.destroy();
    }
    // console.log('Navigator Visible: ', this.state.isNavigatorVisible);
  });
};

handleOpenAddParticipantDialog = (elementData) => {
  this.setState({
    isAddParticipantDialogOpen: true,
    selectedElementForAddParticipant: elementData
  });
};

handleCloseAddParticipantDialog = () => {
  this.setState({
    isAddParticipantDialogOpen: false
  });
};

handleAddParticipant = ({ participantName, participantRoleName, selectedEntity }) => {
  if (participantName) {
    const newCounter = this.state.participant_counter + 1;

    const participant = {
      ...templates.participant,
      '@id': `Participants/${newCounter}/${participantName}`,
      'roleName': participantRoleName,
      'entity': selectedEntity
    };

    this.setState(prevState => ({
      participant_counter: prevState.participant_counter + 1
    }));

    axios.post("/add_participant", {
      event_id: this.state.selectedElementForAddParticipant['@id'],
      participant_data: participant
    })
    .then(res => {
      console.log("Response from server: ", res.data);

      // Increment participant_counter in the .then callback
      this.setState({ participant_counter: this.state.participant_counter + 1 });

      const newSchema = res.data;
      this.setState({
        canvasElements: CytoscapeComponent.normalizeElements(newSchema.events)
      }, () => this.reloadCanvas());  // refresh the graph right after updating the state

      if (this.props.callbackFunction) {
        this.props.callbackFunction(res.data);
      }

      // Display success toast
      toast.success('Participant added successfully!');
    })
    .catch(err => {
      console.error(err);

      // Display error toast
      toast.error('Failed to add participant.');
    });

    this.handleCloseAddParticipantDialog();
  }
};

handleCloseAddEventDialog = () => {
  this.setState({ addEventDialogOpen: false });
};

handleAddEvent = (newEvent) => {
  console.log("Adding new event: ", newEvent);
  this.setState({ 
    addEventDialogOpen: false,
    event_counter: this.state.event_counter + 1,
    // ...you may want to add newEvent to your state somehow here
  });
};

onSubmitEvent = (newEvent) => {
  axios.post("/add_event", {
      ...newEvent,
      parent_id: this.state.selectedElementForAddEvent
  })
  .then(res => {
      console.log("Response from server: ", res.data);
      
      // Update the state with the new schema
      const newSchema = res.data;
      this.setState({
        canvasElements: CytoscapeComponent.normalizeElements(newSchema.events)
      }, () => this.reloadCanvas());  // refresh the graph right after updating the state

      if (this.props.callbackFunction) {
        this.props.callbackFunction(res.data);
      }

      toast.success('Event added successfully!'); // Display success toast
  })
  .catch(err => {
      console.error(err);
      toast.error('Failed to add event.'); // Display error toast
  });
};

handleOpenAddRelationDialog = (elementData) => {
  this.setState({
    addRelationDialogOpen: true,
    selectedElementForAddRelation: elementData
  });
};

handleCloseAddRelationDialog = () => {
  this.setState({
    addRelationDialogOpen: false
  });
};

handleAddRelation = ({ relationName, wdNode, wdLabel, wdDescription, selectedEntityObject }) => {
  if (relationName) {
    const relation = {
      ...templates.relation,
      '@id': `Relations/${relation_counter++}/${relationName}`,
      'name': relationName,
      'wd_node': wdNode,
      'wd_label': wdLabel,
      'wd_description': wdDescription,
      'relationObject': selectedEntityObject,
      'relationSubject': this.state.selectedElementForAddRelation['@id'],
    };

    axios.post("/add_relation", {
      fromNodeId: this.state.selectedElementForAddRelation['@id'],
      toNodeId: selectedEntityObject, // Now, toNodeId is set to the selectedEntityObject
      relation: relation
    })
    .then(res => {
      console.log("Response from server: ", res.data);
      if (this.props.callbackFunction) {
        this.props.callbackFunction(res.data);
      }
    })
    .catch(err => {
      console.error(err);
    });

    this.setState({ 
      addRelationDialogOpen: false,
      relation_counter: this.state.relation_counter + 1,
    });
  }
};

handleOpenAddEntityDialog = (elementData) => {
  this.setState({
    isAddEntityDialogOpen: true,
    selectedElementForAddEntity: elementData
  });
};

handleCloseAddEntityDialog = () => {
  this.setState({
    isAddEntityDialogOpen: false
  });
};

handleAddEntity = (newEntity) => {
  console.log("Adding new entity: ", newEntity);
  axios.post("/add_entity", {
    event_id: this.state.selectedElementForAddEntity['@id'],
    entity_data: newEntity
  })
  .then(res => {
    console.log("Response from server: ", res.data);
    // increment entity_counter in the .then callback
    this.setState({ entity_counter: this.state.entity_counter + 1 });

    // Update the state with the new schema
    // This assumes that `canvasElements` represents the current schema
    const newSchema = res.data;
    this.setState({
      canvasElements: CytoscapeComponent.normalizeElements(newSchema.events)
    }, () => this.reloadCanvas());  // refresh the graph right after updating the state

    if (this.props.callbackFunction) {
      this.props.callbackFunction(res.data);
    }

    // Display success toast
    toast.success('Entity added successfully!');
  })
  .catch(err => {
    console.error(err);

    // Display error toast
    toast.error('Failed to add entity.');
  });
};

handleOpenAddXORDialog = (elementData) => {
  this.setState({
      isAddXORDialogOpen: true,
      selectedElementForAddXOR: elementData
  });
};

handleCloseAddXORDialog = () => {
  this.setState({
      isAddXORDialogOpen: false
  });
};

handleDeleteEntity = (entityId) => {
  if (window.confirm(`Are you sure you want to delete ${entityId}?`)) {
    axios.delete('/delete_entity', { data: { entity_id: entityId } })
      .then((response) => {
        console.log(response);
        // Remove the deleted entity and its participants from the 'allEntities' array
        const updatedEntities = allEntities.filter(entity => entity['@id'] !== entityId);
        allEntities = updatedEntities.map(entity => {
          const updatedParticipants = entity['participant_in'].filter(participant => participant !== entityId);
          return { ...entity, participant_in: updatedParticipants };
        });
        // Update the state with the modified 'allEntities' array
        this.setState({ allEntities: updatedEntities });
      })
      .catch((error) => {
        console.error(error);
      });
  }
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
    this.navigator = this.cy.navigator({
      container: this.navigatorRef.current,
      viewLiveFramerate: 60,
      thumbnailEventFramerate: 60,
      thumbnailLiveFramerate: true,
      dblClickDelay: 20,
    });
    this.cy.fit(); // or this.cy.resize();
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
            if (this.state.isNavigatorVisible) {
              this.initNavigator();
            }
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
                    id: 'add-event',
                    content: 'Add Event',
                    selector: 'node[_shape = "diamond"], node[_type = "gate"]',
                    onClickFunction: (event) => {
                      const elementData = event.target.data();
                      this.setState({ 
                        selectedElementForAddEvent: elementData, 
                        addEventDialogOpen: true
                      });
                    }
                  },
                  {
                    id : 'add-xor-event',
                    content: 'Add XOR Gate',
                    selector: 'node[_shape = "diamond"], node[_type = "ellipse"]',
                    onClickFunction: (event) => {
                        const elementData = event.target.data();
                        this.handleOpenAddXORDialog(elementData);
                    }
                },
                {
                  id: 'add-relation',
                  content: 'Add Relation',
                  selector: 'node[_type = "entity"]',
                  onClickFunction: (event) => {
                    this.setState({ 
                      selectedElementForAddRelation: event.target.data(),
                      addRelationDialogOpen: true
                    });
                  }
                },
                {
                  id: 'add-participant',
                  content: 'Add Participant',
                  selector: 'node[_shape = "ellipse"]',
                  onClickFunction: (event) => {
                    const elementData = event.target.data();
                    this.handleOpenAddParticipantDialog(elementData);
                  },
                },
                {
                  id: 'add-entity',
                  content: 'Add Entity',
                  selector: 'node[_shape = "diamond"], node[_shape = "ellipse"]',
                  onClickFunction: (event) => {
                    const elementData = event.target.data();
                    this.handleOpenAddEntityDialog(elementData);
                  },
                  hasTrailingDivider: true
                },
                {
                  id: 'view-entities',
                  content: 'View Entities',
                  selector: 'node[_shape = "diamond"], node[_shape = "ellipse"]',
                  onClickFunction: (event) => {
                    axios
                      .get('/get_all_entities')
                      .then((response) => {
                        let allEntities = response.data;
                        console.log(allEntities);
                    
                        // Sort entities by the length of 'participant_in' array in descending order
                        allEntities.sort((a, b) => b['participant_in'].length - a['participant_in'].length);
                    
                        const dialogContent = (
                          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxHeight: '90vh' }}>
                            <div className="draggable-handle" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1em', borderBottom: '1px solid #CCC' }}>
                              <Typography variant="h5" style={{ flexGrow: 1, color: '#1565c0', margin: '1em 0' }}>Global Entity Table</Typography>
                              <IconButton onClick={() => this.setState({ dialogOpen: false })} style={{ margin: '0.5em' }}>
                                <CloseIcon />
                              </IconButton>
                            </div>
                            <div style={{ overflow: 'auto', maxHeight: '80vh' }}>
                              <table style={{ borderCollapse: 'collapse', width: '100%', margin: '1em 0', tableLayout: 'auto' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid black' }}>
                                    <th style={{ padding: '0.5em', color: '#1565c0', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#FFF' }}>Delete</th>
                                    <th style={{ padding: '0.5em', color: '#1565c0', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#FFF' }}>Entity Name</th>
                                    <th style={{ padding: '0.5em', color: '#1565c0', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#FFF' }}>WikiData Label</th>
                                    <th style={{ padding: '0.5em', color: '#1565c0', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#FFF' }}>Entity ID</th>
                                    <th style={{ padding: '0.5em', color: '#1565c0', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#FFF' }}>Created In</th>
                                    <th style={{ padding: '0.5em', color: '#1565c0', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#FFF' }}>Participant In</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allEntities.map((entity) => (
                                    <tr key={entity['@id']} style={{ borderBottom: '1px solid black' }}>
                                      <td style={{ padding: '0.5em' }}>
                                        <button
                                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                          onClick={() => this.handleDeleteEntity(entity['@id'])}
                                        >
                                          <DeleteIcon style={{ color: '#1565c0' }} />
                                        </button>
                                      </td>
                                      <td style={{ padding: '0.5em' }}>{entity['name']}</td>
                                      <td style={{ padding: '0.5em' }}>{entity['wd_label']}</td>
                                      <td style={{ padding: '0.5em' }}>{entity['@id']}</td>
                                      <td style={{ padding: '0.5em' }}>{entity['created_in'].join(', ')}</td>
                                      <td style={{ padding: '0.5em' }}>{entity['participant_in'].join(', ')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
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
      if (this.props.selectedElement) {
          this.setState({ 
              isGraphEditOpen: true,
              selectedElementForGraphEdit: this.props.selectedElement
          });
      } else {
          this.setState({ 
              isGraphEditOpen: false,
              selectedElementForGraphEdit: null
          });
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
    // console.log('Navigator Style:', navigatorStyle);

    return (
        <div className={this.props.className} style={{ width: 'max-content', display: 'inline-flex' }}>
            <CytoscapeComponent
                elements={this.state.canvasElements}
                layout={CyStyle.layout}
                style={style}
                stylesheet={CyStyle.stylesheet}
                cy={(cy) => { this.cy = cy }}
                maxZoom={3} minZoom={0.37}
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
                <Tooltip title="Refresh">
                    <RefreshIcon
                        type='button'
                        color="action"
                        fontSize='large'
                        onClick={this.reloadCanvas}
                    />
                </Tooltip>
                <Tooltip title="View JSON Tree">
                    <EditIcon
                        type="button"
                        color="action"
                        fontSize="large"
                    />
                </Tooltip>
                <Tooltip title="Toggle Navigator">
                    <MapIcon
                        type="button"
                        color="action"
                        fontSize="large"
                        onClick={this.handleNavigatorToggle}
                    />
                </Tooltip>
                <Tooltip title="Adjust Aspect Ratio">
                    <AspectRatioIcon
                        type='button'
                        color="action"
                        fontSize='large'
                        onClick={this.fitCanvas}
                    />
                </Tooltip>
                <Tooltip title="Download Image">
                    <SaveIcon
                        type="button"
                        color="action"
                        fontSize="large"
                        onClick={this.download}
                    />
                </Tooltip>
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
                resetSelectedElement={this.resetSelectedElement}
                />
            <AddParticipantDialog
                open={this.state.isAddParticipantDialogOpen}
                onClose={this.handleCloseAddParticipantDialog}
                onSubmit={this.handleAddParticipant}
                selectedElement={this.state.selectedElementForAddParticipant}
                />
            <AddEventDialog 
                open={this.state.addEventDialogOpen} 
                onClose={this.handleCloseAddEventDialog}
                onSubmit={this.onSubmitEvent}
                selectedElement={this.state.selectedElementForAddEvent}
                />
            <AddRelationDialog 
                open={this.state.addRelationDialogOpen} 
                onClose={this.handleCloseAddRelationDialog}
                onSubmit={this.handleAddRelation}
                selectedElement={this.state.selectedElementForAddRelation}
                />
            <AddEntityDialog 
                open={this.state.isAddEntityDialogOpen} 
                onClose={this.handleCloseAddEntityDialog}
                onSubmit={this.handleAddEntity}
                selectedElement={this.state.selectedElementForAddEntity}
                entityCounter={this.state.entity_counter}
                />
            <AddXORDialog
                open={this.state.isAddXORDialogOpen}
                handleClose={this.handleCloseAddXORDialog}
                selectedElement={this.state.selectedElementForAddXOR}
                callbackFunction={this.props.callbackFunction}
                />
            </div>
        );
    }
}


export default Canvas;