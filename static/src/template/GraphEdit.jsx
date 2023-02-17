import React, { useEffect, useState, useRef } from "react";
import "regenerator-runtime/runtime";
import { isBoolean, isEmpty } from "lodash";
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle, 
  TextField 
} from "@mui/material";

const GraphEdit = React.forwardRef((props, ref) => {
  const initData = {
    selectedElement: props.selectedElement,
  };
  console.log("props.selectedElement: ", props.selectedElement);

  const [data, setData] = useState(initData);
  const [edit, setEdit] = useState("");
  const [open, setOpen] = useState(!!props.selectedElement);
  const refFocus = useRef(null);

  useEffect(() => {
    const newData = { selectedElement: props.selectedElement };
    setData(newData);
    setOpen(!!props.selectedElement);
  }, [props.selectedElement]);

  const handleEdit = (key, value) => {
    // freeze original data in edit
    if (!edit) {
      setEdit(data.selectedElement[key]);
    }
  
    // update data state with the new value if it has been changed
    if (edit !== value) {
      setData(prevData => ({
        ...prevData,
        selectedElement: {
          ...prevData.selectedElement,
          [key]: value,
        },
      }));
    }
  };

  const handleChange = (e) => {
    // change text that shows up in text field
    setEdit(e.target.value);
  
    // update data state with the new value
    setData(prevData => ({
      ...prevData,
      selectedElement: {
        ...prevData.selectedElement,
        [e.target.name]: e.target.value,
      },
    }));
  };

  const handleSubmit = async () => {
    // create data to pass up
    const updatedData = {};
    for (const [key, val] of Object.entries(data.selectedElement)) {
      if (!["_label", "_type", "_shape", "outlinks", "_edge_type"].includes(key)) {
        updatedData[key] = val;
      }
    }
  
    console.log("Submitting node data: ", updatedData);
  
    // Send the updated data to Flask app via a POST request
    const response = await fetch('/update-node-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
  
    const new_data = await response.json();
    console.log("New data: ", new_data);
  
    // close the dialog
    handleClose();
  };

  const handleClose = () => {
    // close the dialog
    console.log("Closing dialog");
    console.log("Type of onClose: ", typeof props.onClose);
    setOpen(false);
    props.onClose();
  };

  let i = 0;
  const excluded_ids = ['_label', '_type', '_shape', 'outlinks', '_edge_type', 'child', 'key']
  const selectedElement = data.selectedElement || {};

  console.log("data: ", data);
  return (
    <Dialog open={open} onClose={handleClose} ref={ref} maxWidth={false}>
      <DialogTitle>{isEmpty(data) ? "" : data.selectedElement?.["_label"]}</DialogTitle>
      <DialogContent>
        {isEmpty(data) ? (
          ""
        ) : (
          <DialogContentText>
            Edit the properties of {data.selectedElement?._type}.
          </DialogContentText>
        )}
        <form noValidate autoComplete="off">
          {data.selectedElement && Object.entries(data.selectedElement).map(([key, val]) => (
            !excluded_ids.includes(key) && typeof val === "string" && (
              <TextField
                key={key}
                fullWidth
                margin="dense"
                id={key}
                label={key}
                name={key}
                value={edit === key ? edit : val}
                multiline={true}
                onChange={handleChange}
                onBlur={() => handleEdit(key, edit)}
                inputRef={key === 'name' ? refFocus : null}
              />
            )
          ))}
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
});

export default GraphEdit;