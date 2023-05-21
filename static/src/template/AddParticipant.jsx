import React, { useState, useEffect } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Select, MenuItem, InputLabel, FormControl, Paper } from '@material-ui/core';
import Draggable from 'react-draggable';
import axios from 'axios';

function PaperComponent(props) {
  return (
    <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

function AddParticipantDialog({ open, onClose, onSubmit, selectedElement }) {
  const [participantName, setParticipantName] = useState('');
  const [participantRoleName, setParticipantRoleName] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [allEntities, setAllEntities] = useState([]);

  useEffect(() => {
    fetchAllEntities();
  }, [selectedElement]);

  const fetchAllEntities = () => {
    axios.get('/get_all_entities')
      .then((response) => {
        const entities = response.data.sort((a, b) => a.name.localeCompare(b.name)); // Sort entities alphabetically
        setAllEntities(entities);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handleSubmit = () => {
    if(participantName === '' || participantRoleName === '' || selectedEntity === '') {
      alert("All fields must be filled out before submitting.");
      return;
    }
    console.log("Submitting: ", { participantName, participantRoleName, selectedEntity });
    onSubmit({ participantName, participantRoleName, selectedEntity });
    setParticipantName('');
    setParticipantRoleName('');
    setSelectedEntity('');
  };

  return (
    <Dialog open={open} onClose={onClose} PaperComponent={PaperComponent}>
      <DialogTitle id="draggable-dialog-title">Add Participant</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter participant details.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Participant Name"
          type="text"
          fullWidth
          value={participantName}
          onChange={(e) => setParticipantName(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Participant Role Name"
          type="text"
          fullWidth
          value={participantRoleName}
          onChange={(e) => setParticipantRoleName(e.target.value)}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Selected Entity</InputLabel>
          <Select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
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
        Add Participant
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddParticipantDialog;