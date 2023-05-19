import React, { useState, useEffect } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Select, MenuItem, InputLabel, FormControl } from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import Draggable from 'react-draggable';
import axios from 'axios';

function PaperComponent(props) {
  return (
    <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

function AddRelationDialog({ open, onClose, onSubmit, selectedElementSubject }) {
  const [relationName, setRelationName] = useState('');
  const [wdNode, setWdNode] = useState('');
  const [wdLabel, setWdLabel] = useState('');
  const [wdDescription, setWdDescription] = useState('');
  const [selectedEntityObject, setSelectedEntityObject] = useState('');
  const [allEntities, setAllEntities] = useState([]);

  useEffect(() => {
    fetchAllEntities();
  }, []);

  const fetchAllEntities = () => {
    axios.get('/get_all_entities')
      .then((response) => {
        const entities = response.data
          .filter(entity => entity['@id'] !== selectedElementSubject)
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort entities alphabetically
        setAllEntities(entities);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleSubmit = () => {
    if(relationName === '' || wdNode === '' || wdLabel === '' || wdDescription === '' || selectedEntityObject === '') {
      alert("All fields must be filled out before submitting.");
      return;
    }
    console.log("Submitting: ", { relationName, wdNode, wdLabel, wdDescription, selectedEntityObject });
    onSubmit({ relationName, wdNode, wdLabel, wdDescription, selectedEntityObject });
    setRelationName('');
    setWdNode('');
    setWdLabel('');
    setWdDescription('');
    setSelectedEntityObject('');
  };

  return (
    <Dialog open={open} onClose={onClose} PaperComponent={PaperComponent}>
      <DialogTitle id="draggable-dialog-title">Add Relation</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter relation details.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Relation Name"
          type="text"
          fullWidth
          value={relationName}
          onChange={(e) => setRelationName(e.target.value)}
        />
        <TextField
          margin="dense"
          label="WikiData Node"
          type="text"
          fullWidth
          value={wdNode}
          onChange={(e) => setWdNode(e.target.value)}
        />
        <TextField
          margin="dense"
          label="WikiData Label"
          type="text"
          fullWidth
          value={wdLabel}
          onChange={(e) => setWdLabel(e.target.value)}
        />
        <TextField
          margin="dense"
          label="WikiData Description"
          type="text"
          fullWidth
          value={wdDescription}
          onChange={(e) => setWdDescription(e.target.value)}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Relation Object Entity</InputLabel>
          <Select
            value={selectedEntityObject}
            onChange={(e) => setSelectedEntityObject(e.target.value)}
          >
            {allEntities.map((entity) => (
              <MenuItem key={entity['@id']} value={entity['@id']}>{entity.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Add Relation
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddRelationDialog;
