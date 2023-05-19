import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Paper } from '@material-ui/core';
import templates from './templates'; // path to your templates file

function PaperComponent(props) {
    return (
      <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
        <Paper {...props} />
      </Draggable>
    );
  }

function AddEntityDialog({ open, onClose, onSubmit, selectedElementForAddEntity, entityCounter }) {
  const [entityName, setEntityName] = useState('');
  const [entityWdNode, setEntityWdNode] = useState('');
  const [entityWdLabel, setEntityWdLabel] = useState('');
  const [entityWdDescription, setEntityWdDescription] = useState('');

  const handleSubmit = () => {
    if(entityName === '') {
      alert("Entity name must be filled out before submitting.");
      return;
    }

    const template = templates['entity'];
    console.log("Submitting: ", { entityName, entityWdNode, entityWdLabel, entityWdDescription });
    const newEntity = {
      ...template,
      '@id': `Entities/${entityCounter}/${entityName}`,
      'name': entityName,
      'wd_node': entityWdNode,
      'wd_label': entityWdLabel,
      'wd_description': entityWdDescription
    };
    onSubmit(newEntity);
    setEntityName('');
    setEntityWdNode('');
    setEntityWdLabel('');
    setEntityWdDescription('');
  };

  return (
    <Dialog open={open} onClose={onClose} PaperComponent={PaperComponent}>
    <DialogTitle id="draggable-dialog-title">Add Entity</DialogTitle>
    <DialogContent>
        <DialogContentText>
        Please enter entity details.
        </DialogContentText>
        <TextField 
            autoFocus 
            margin="dense" 
            label="Entity Name" 
            type="text" 
            fullWidth
            value={entityName}
            onChange={e => setEntityName(e.target.value)}
        />
        <TextField 
            margin="dense" 
            label="Entity wd_node" 
            type="text" 
            fullWidth
            value={entityWdNode}
            onChange={e => setEntityWdNode(e.target.value)}
        />
        <TextField 
            margin="dense" 
            label="Entity wd_label" 
            type="text" 
            fullWidth
            value={entityWdLabel}
            onChange={e => setEntityWdLabel(e.target.value)}
        />
        <TextField 
            margin="dense" 
            label="Entity wd_description" 
            type="text" 
            fullWidth
            value={entityWdDescription}
            onChange={e => setEntityWdDescription(e.target.value)}
        />
    </DialogContent>
    <DialogActions>
        <Button onClick={onClose}>
        Cancel
        </Button>
        <Button onClick={handleSubmit}>
        Add Entity
        </Button>
    </DialogActions>
    </Dialog>
  );
}

export default AddEntityDialog;