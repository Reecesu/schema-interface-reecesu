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
    // add new chapter event @id to children list of selectedElement
    // const selectedElement = this.state.selectedElement;
    // selectedElement.children.push(chapterEvent['@id']);
    // this.setState({ selectedElement });
  
    // make POST request to add the new chapter event to the schema JSON
    chapterEvent['parent_id'] = this.state.selectedElement;
    axios.post(`/add_event`, chapterEvent)
      .then((res) => {
        console.log(res.data);
        // if (this.state.hasSubtree && this.state.topTree.includes(node)) {
        //     this.removeSubTree();
        // }
        // this.setState({ hasSubtree: true });
        // this.cy.add(res.data);
        // this.runLayout();
      })
      .catch((error) => {
        console.log(error);
      });
    console.log('chapterEvent:', chapterEvent);
    console.log('selectedElementId:', selectedElementId);
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
                    onClickFunction: event => {
                        const elementData = event.target.data();
                        console.log('selectedElement (right-click menu):', elementData);
                        this.setState({ selectedElement: elementData });
                        this.setState({ isGraphEditOpen: true });
                    },
                },
                {
                    id: 'remove',
                    content: 'Remove',
                    selector: 'node, edge',
                    onClickFunction: (event) => {
                        this.removeObject(event);

                        /**                         
                        TODO:
                        1. Remove selectedElement from JSON event list.
                        2. Remove mention of selectedElement from outlinks list of all other events.
                        3. Remove mention of selectedElement from children list of all other events.
                        4. f the selectedElement had items in it's children list, those items should be added the children list of selectedElement's parent node.
                         */

                    },
                },
                {
                    id: 'add-outlink',
                    content: 'Add Outlink',
                    selector: 'node[_shape = "diamond"], node[_shape = "ellipse"]',
                    onClickFunction: (event) => {
                        /**
                        1. Display list of all available nodes.
                        2. Selected node @id is added to outlinks list of selectedElement.
                         */
                    },
                },
                {
                    id: 'add-chapter-event',
                    content: 'Add Chapter Event',
                    selector: 'node[_shape = "diamond"], node[_type = "gate"]',
                    onClickFunction: (event) => {
                        event.preventDefault();
                      
                        const elementData = event.target.data();
                        this.setState({ selectedElement: elementData });
                        const eventName = prompt('Enter chapter event name:');
                        if (eventName) {
                            const chapterEvent = {
                                ...templates.chapterEvent,
                                '@id': `Events/${event_counter++}/${eventName}`,
                                'name': eventName
                            };
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
                        event.preventDefault();
                        /**
                        1. Dialog prompt user to input primitive event 'name'.
                        2. Unique @id is generated from 'Events/' + event_counter + '/' + 'name'.
                        3. PRIMITIVE_TEMPLATE is appended to event list with unique @id, and name.
                        4. Add new primitive event @id to children list of selectedElement.
                        */
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
                        /**
                        1. Unique @id is generated from 'Events/' + event_counter + '/' + 'container:xor'.
                        2. XOR_TEMPLATE is appended to event list with same name 'Events/2xxxx/container:xor'.
                        3. Unique @id is added to children list of selectedElement.
                        */
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
                    selector: 'node[_shape = "diamond"], node[_type = "ellipse"]',
                    onClickFunction: (event) => {
                        /**
                        1. TextField appears.
                        2. User inputs name, wd_node, wd_label, and wd_description (all but name can be blank).
                        3. Unique @id is generated from 'Entities/' + entity_counter + '/' + 'name' (Entities/2xxxx/name).
                        4. Append ENTITY_TEMPLATE to selectedElement entity list with same 'name' and @id 'Entities/xxxxx/name'.

                        NOTE: entity_counter is a global variable that is incremented every time an entity is added.
                                entites can be edited and removed from 'view-entites' menuItem on container and primitive events

                        ENTITY_TEMPLATE:

                            {
                                "@id": "",
                                "name": "",
                                "wd_node": "",
                                "wd_label": "",
                                "wd_description": ""
                            },
                        */
                    },
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
                        /** 
                        1. System waits for user to select another entity node.
                        2. Get second selectedElements @id.
                        3. Dialog appears with six textfields.
                        4. "relationSubject" populated with first selectedElement @id.
                        5. "relationObject" populated with second selectedElement @id.
                        6. 'name' is only other required field.
                        7. Relation @id is generated from 'Relations/' + relation_counter + '/' + 'name'.
                             NOTE: wd_node, wd_label, and wd_description can be filled in with edit if at first missing.
                        8. RELATION_TEMPLATE is appended to selectedElement relation list with same name 'Relations/xxxxx/name'.

                        RELATION_TEMPLATE:

                            {
                                "@id": "",
                                "name": "",
                                "relationSubject": "",
                                "relationObject": "",
                                "wd_node": "",
                                "wd_label": "",
                                "wd_description": ""
                            },
                        */
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