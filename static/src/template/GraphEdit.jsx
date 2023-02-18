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
  TextField,
  Switch
} from "@mui/material";
import _ from "lodash";

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
      setEdit(_.get(data.selectedElement, key));
    }

    // update data state with the new value if it has been changed
    if (edit !== value) {
      setData(prevData => {
        const newSelectedElement = {
          ...prevData.selectedElement,
          [key]: value,
        };
        return {
          ...prevData,
          selectedElement: newSelectedElement,
        };
      });
    }
  };

  const handleChange = (e) => {
    // change text that shows up in text field
    setEdit(e.target.value);

    // update data state with the new value
    setData(prevData => {
      const newSelectedElement = {
        ...prevData.selectedElement,
        [e.target.name]: e.target.value,
      };
      return {
        ...prevData,
        selectedElement: newSelectedElement,
      };
    });
  };

  const handleSwitchChange = (e) => {
    // update data state with the new value
    setData(prevData => {
      const newSelectedElement = {
        ...prevData.selectedElement,
        [e.target.name]: e.target.checked,
      };
      return {
        ...prevData,
        selectedElement: newSelectedElement,
      };
    });
  };

  const handleSubmit = async () => {
    // create data to pass up
    const updatedData = { ...data.selectedElement };
    delete updatedData['_label'];
    delete updatedData['_type'];
    delete updatedData['_shape'];
    delete updatedData['_edge_type'];
    delete updatedData['outlinks'];

    console.log("Submitting node data: ", updatedData);

    // Send the updated data to Flask app via a POST request
    const response = await fetch('/update_json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
    console.log("Response from the server: ", response);

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
  };

  let i = 0;
  const excluded_ids = ['id', '_label', '_type', '_shape', 'outlinks', '_edge_type', 'child', 'children','participants' ,'entities' ,'relations' , 'key']
  const selectedElement = data.selectedElement || {};

  console.log("data: ", data);
  console.log("selectedElement: ", selectedElement);
  console.log("edit: ", edit);
  console.log("open: ", open);
  console.log("refFocus: ", refFocus);

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
            !excluded_ids.includes(key) && (
              <TextField
                key={key}
                fullWidth
                margin="dense"
                id={key}
                label={key}
                name={key}
                value={val}
                onChange={handleChange}
                onBlur={() => handleEdit(key, edit)}
                inputRef={key === 'name' ? refFocus : null}
                multiline={Array.isArray(val) || isBoolean(val)}
                select={isBoolean(val)}
                SelectProps={isBoolean(val) ? {
                  native: true
                } : undefined}
              >
                {Array.isArray(val) ? val.map((item, index) => (
                  <option key={index} value={item}>{item}</option>
                )) : isBoolean(val) ? (
                  <>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </>
                ) : null}
              </TextField>
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