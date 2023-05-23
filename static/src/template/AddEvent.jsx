import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, FormControlLabel, Switch } from '@material-ui/core';
import templates from './templates';
import Draggable from 'react-draggable';
import { Paper } from '@material-ui/core';

function PaperComponent(props) {
    return (
      <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
        <Paper {...props} />
      </Draggable>
    );
  }

let event_counter = 20000;

function AddEventDialog({ open, onClose, onSubmit }) {
  const [eventName, setEventName] = useState('');
  const [isChapterEvent, setIsChapterEvent] = useState(false);

  const handleSubmit = () => {
    if(eventName === '') {
      alert("Event name must be filled out before submitting.");
      return;
    }

    const eventType = isChapterEvent ? 'chapterEvent' : 'primitiveEvent';
    const template = templates[eventType];
    console.log("Submitting: ", { eventName, eventType });
    const newEvent = {
      ...template,
      '@id': `Events/${event_counter++}/${eventName}`,
      'name': eventName
    };
    onSubmit(newEvent);
    setEventName('');
    setIsChapterEvent(false);
  };

  return (
    <Dialog open={open} onClose={onClose} PaperComponent={PaperComponent}>
    <DialogTitle id="draggable-dialog-title">Add Event</DialogTitle>
        <DialogContent>
            <DialogContentText>
            Please enter event name.
            </DialogContentText>
            <TextField
            autoFocus
            margin="dense"
            label="Event Name"
            type="text"
            fullWidth
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            />
            <FormControlLabel
            control={<Switch checked={isChapterEvent} onChange={(e) => setIsChapterEvent(e.target.checked)} />}
            label="Event Type"
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>
            Cancel
            </Button>
            <Button onClick={handleSubmit}>
            Add {isChapterEvent ? 'Chapter Event' : 'Primitive Event'}
            </Button>
        </DialogActions>
    </Dialog>
  );
}

export default AddEventDialog;
