# schema-interface

## Introduction

This is a web tool to visualize KAIROS Schema Format generated schemas using Cytoscape.js and React.js. The tool also allows editing of these schemas for curation purpose. Current supported SDF version is **3.0**.

**This project is currently a work in progress and is in alpha testing. Feedbacks and suggestions are welcome.**

## Getting Started

To run the project locally one needs to have following libraries installed:

* npm 6.13.4 (or latest)
* Python 3.7.3 (or latest)
* pip 20.1.1 (or latest)

First run:

* `cd path/to/project/schema-interface`
* `sh first_run.sh`
* If rendering fails: `sh run_local.sh` 

Subsequent runs:

* `cd path/to/project/schema-interface`
* `sh run_local.sh`

Once the server has started, run the localhost with the port mentioned in the terminal in the browser. The tool will render.

## Libraries

The tool mainly uses 3 resources:

* [Flask](https://flask.palletsprojects.com/en/1.1.x/) : A Python micro web framework used for writing the backend functionality of the tool. Schema extraction and edit handling has been done in Flask.
* [React.js](https://reactjs.org/): A frontend JavaScript library responible for rendering the UI. All the interactions between the visualization and the backend framwork is handled by React.
* [Cytoscape.js](https://js.cytoscape.org/): A data visualization library that uses the extracted schema, provided by React from backend, to provide a graphical structure in a sequential order.
  * Edits on the JSON are handled using the `jsoneditor`[[1]](https://github.com/josdejong/jsoneditor) library or through the sidebar next to the canvas.

## Usage
[Manual](https://chrysographes.notion.site/Schema-Curation-Manual-018034f383a24f75a4c10fc378678d75)

### Viewer
- **Upload Schema** to upload a JSON file from your local file system, and **download** it when you are done with curation.
- **Canvas** shows a graphical representation of the uploaded JSON file. The canvas allows for zoom and node drag-and-drop. Nodes can be clicked to show subtrees of children nodes and participants.
  - **Reloading** the canvas is supported with a reload icon on the top right corner of the canvas. 
  - **Resizing** the canvas according to the graph is supported with a fit icon under the reload icon. 
- A **Sidebar** is available on the left side of the canvas giving information about the selected node. This window opens only when a node is right-clicked. It gives the details about the node, such as its name, id, description, comments, explanation from TA1, importance, etc. All information is directly taken from the JSON. The sidebar details can be edited to bypass the JSON editor.
- **JSON Editor**[[1]](https://github.com/josdejong/jsoneditor) showing the uploaded JSON. Editing the JSON will update the graph in the canvas. Functionalities include:
  - **Expand and Collapse All** lists and dictionaries of the JSON.
  - **Sort contents**
  - **History** for accidents.
  - **Search Bar** to locate events more easily.
  - **Drag** to move fields and their values between lists and dictionaries.
  - **Templates** of events, children, participants, etc. for easier curation.
  - **Duplication**
  - **Deletion**
---
[[1]](https://github.com/josdejong/jsoneditor) A web-based tool to view, edit, format, and validate JSON by Jos de Jong
