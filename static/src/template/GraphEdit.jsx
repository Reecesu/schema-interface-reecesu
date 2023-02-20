import React, { useEffect, useState, useRef } from "react";
// import "regenerator-runtime/runtime";
import axios from "axios";
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

  const handleSubmit = (e) => {
    // create data to pass up
    const node_data = {
      id: data.selectedElement['id'],
      updatedFields: {},
    };
  
    // loop through the selected element's fields and check which ones were updated
    Object.entries(data.selectedElement).forEach(([key, value]) => {
      if (key === 'id' || excluded_ids.includes(key)) return;
      if (value !== props.selectedElement[key]) {
        node_data.updatedFields[key] = value;
      }
    });
  
    console.log("The node data from handleSubmit:\n", node_data);
    
    // change sidebar internal id if the id is changed
    if(e.target.id === '@id'){
      data.selectedElement['id'] = e.target.value;
      setData({ ...data });
      console.log(data.selectedElement['id']);
    }
  
    props.sideEditorCallback(node_data);
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