import React, { Component } from 'react';
import isEmpty from 'lodash/isEmpty';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import IconButton from '@mui/material/IconButton';
import DownloadIcon from '@mui/icons-material/CloudDownload';

import axios from 'axios';
import UploadModal from './UploadModal';
import MuiDrawer from './MuiDrawer';
import Canvas from './Canvas';
import SideEditor from './SideEditor';
import JsonEdit from './JsonEdit';

/* Viewer page for the schema interface. */
class Viewer extends Component {
    constructor(props) {
        super(props)

        this.state = {
            schemaResponse: '',
            schemaName: '',
            schemaJson: '',
            isOpen: false,
            isUpload: false,
            downloadUrl: '',
            fileName: 'schema.json',

            nodeData: {}
        }

        this.callbackFunction = this.callbackFunction.bind(this);
        this.jsonEditorCallback = this.jsonEditorCallback.bind(this);
        this.sidebarCallback = this.sidebarCallback.bind(this);
        this.sideEditorCallback = this.sideEditorCallback.bind(this);
        this.download = this.download.bind(this);

    }

    callbackFunction(response) {
        /* Updates back-end data */
        this.setState({
            schemaResponse: Object.assign({}, response.parsedSchema),
            schemaName: response.name,
            schemaJson: response.schemaJson,
            isUpload: true
        });
    }

    callbackFromDrawer = (showJsonEdit) => {
        this.setState({ showJsonEdit });
    }

    download(event) {
        /* Handles downloading the schema JSON */
        event.preventDefault();
        const output = JSON.stringify(this.state.schemaJson, null, 4)
        const blob = new Blob([output], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        this.setState({ downloadUrl: url },
            () => {
                this.dofileDownload.click();
                URL.revokeObjectURL(url);
                this.setState({ downloadUrl: '' })
            })
    }

    jsonEditorCallback(json) {
        /* Handles changes from the JSON editor */
        if (JSON.stringify(json) === JSON.stringify(this.state.schemaJson))
            return false;
        axios.post("/reload", json)
            .then(res => {
                toast.success('Reload success')
                this.callbackFunction(res.data);
            })
            .catch(err => {
                let error = err.response.data;
                let error_title = error.slice(error.indexOf("<title>") + 7, error.lastIndexOf("</title>"));
                let error_notif = error_title.slice(0, error_title.indexOf("//"));
                if (error_notif.includes('root_node'))
                    error_notif = "UnboundLocalError: Root node not found.\nPlease make sure you have a root node that has an 'or' children_gate for hierarchy visualization.";
                if (error_notif.includes("KeyError: 'children_gate'"))
                    error_notif = "KeyError: no children_gate in an event with children.";
                if (error_notif.includes("KeyError: 'comment'"))
                    error_notif = "KeyError: no comment in a child event.\nTry using the preprocess.py in scripts to make sure your file is suitable for curation.";
                toast.error(error_notif);
                return false;
            });
    }

    sidebarCallback(data) {
        /* Opens / closes the sidebar */
        if (isEmpty(data)) {
            this.setState({
                isOpen: false,
                nodeData: data
            });
        } else {
            this.setState({
                isOpen: true,
                nodeData: data
            });
        }
    }

    sideEditorCallback(data) {
        /* Handles changes through the sidebar */
        axios.post("/node", data)
            .then(res => {
                this.jsonEditorCallback(res.data);
            })
            .catch(err => {
                let error = err.response.data;
                let error_title = error.slice(error.indexOf("<title>") + 7, error.lastIndexOf("</title>"));
                let error_notif = error_title.slice(0, error_title.indexOf("//"));
                toast.error(error_notif);
                return false;
            });
    }

    render() {
        let canvas = "";
        let schemaHeading = "";
        let muiDrawer = "";
        let sidebarClassName = this.state.isOpen ? "sidebar-open" : "sidebar-closed";
        let canvasClassName = this.state.isOpen ? "canvas-shrunk" : "canvas-wide";
    
        // a schema exists
        if (this.state.schemaResponse !== '') {
            // title of schema
            schemaHeading = <h3 className="schema-name col-md-8" style={{ textAlign: 'center' }}>
                {this.state.schemaName}
            </h3>;
    
            // graph (cytoscape)
            canvas = <Canvas id="canvas"
                elements={this.state.schemaResponse}
                sidebarCallback={this.sidebarCallback}
                sideEditorCallback={this.sideEditorCallback}
                className={canvasClassName}
            />;
    
            muiDrawer = <MuiDrawer
                open={this.props.drawerOpen}
                handleToggle={this.props.handleToggle}
                schemaJson={this.state.schemaJson}
                parentCallback={this.jsonEditorCallback} 
            />;
        }
    
        return (
            <div id="viewer">
                <div className='container'>
                    <ToastContainer theme="colored" />
                    <UploadModal buttonLabel="Upload Schema" parentCallback={this.callbackFunction} />
                    <IconButton aria-label="download" disabled={!this.state.isUpload} color="primary" onClick={this.download}>
                        <DownloadIcon />
                    </IconButton>
                    <a style={{ display: "none" }}
                        download={this.state.fileName}
                        href={this.state.downloadUrl}
                        ref={e => this.dofileDownload = e}
                    >download it</a>
                </div>
                <div className="row">{schemaHeading}</div>
                <div style={{ display: 'inline-flex' }}>
                    {/* {console.log("Testing from Viewer.jsx", this.state.schemaJson)} */}
                    {muiDrawer}
                    {canvas}
                </div>
            </div>
        )
    }
}

export default Viewer;