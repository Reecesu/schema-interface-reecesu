import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@material-ui/core';
import axios from 'axios';
import templates from './templates';
import Draggable from 'react-draggable';
import Paper from '@material-ui/core/Paper';

let xor_counter = 20000; // Initialize a counter for XOR gates

function PaperComponent(props) {
  return (
    <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

const AddXORDialog = ({ open, handleClose, selectedElement, updateCallback }) => {
    const [xorName, setXorName] = useState("");

    const handleAddXOR = () => {
        if (xorName) {
            const xorEvent = {
                ...templates.xorGate,
                '@id': `Events/${xor_counter++}/${xorName}`,
                'name': xorName
            };

            axios.post("/add_event", {
                ...xorEvent,
                parent_id: selectedElement
            })
            .then(res => {
                console.log("Response from server: ", res.data);
                if (updateCallback) {
                    updateCallback(res.data);
                }
            })
            .catch(err => {
                console.error(err);
            });

            handleClose();
        }
    };

    const handleInputChange = (event) => {
        setXorName(event.target.value);
    };

    return (
        <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title" PaperComponent={PaperComponent}>
            <DialogTitle id="draggable-dialog-title">Add XOR Gate</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    label="XOR Gate Name"
                    type="text"
                    fullWidth
                    value={xorName}
                    onChange={handleInputChange}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleAddXOR} color="primary">
                    Add
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddXORDialog;