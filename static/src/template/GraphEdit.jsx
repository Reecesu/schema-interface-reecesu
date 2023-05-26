import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { blue } from '@material-ui/core/colors';
import { isBoolean, isEmpty } from "lodash";
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  FormControlLabel,
  DialogTitle, 
  TextField,
  Switch,
  Typography,
  Paper,
  Box,
  makeStyles
} from "@material-ui/core";
import _ from "lodash";
import Draggable from 'react-draggable';

function PaperComponent(props) {
  return (
    <Draggable handle="#draggable-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

const useStyles = makeStyles((theme) => ({
  halfWidthDialog: {
    width: '50%', // Change the width of the dialog to 50%
  },
  dialogTitle: {
    fontSize: '3rem',
    color: blue[900], // Change color to darker blue
  },
  header: {
    fontSize: '1rem', // normal size
    fontWeight: 'bold', // make the font bold
    color: blue[900], // Change color to darker blue
  },
  multilineInput: {
    minHeight: '3em', // Set the minimum height to accommodate 3 lines
    maxHeight: '6em', // Set the maximum height to accommodate 3 lines
    overflow: 'hidden', // Clip text to the last line
  },
}));

const GraphEdit = React.forwardRef((props, ref) => {
  const initData = {
    selectedElement: props.selectedElement,
    entityNames: {},
    eventNames: {}
  };

  const classes = useStyles();

  const [data, setData] = useState(initData);
  const [edit, setEdit] = useState("");
  const [open, setOpen] = useState(!!props.selectedElement);
  const refFocus = useRef(null);

  // Add a useEffect hook to fetch entity names from the server
  useEffect(() => {
    axios.get("/get_all_entities").then(res => {
      const entityNames = {};
      res.data.forEach(entity => {
        entityNames[entity["@id"]] = entity["name"];
      });
      setData(prevData => ({ ...prevData, entityNames }));
    });
    // TODO: Similarly, fetch event names from the server
  }, []);

  useEffect(() => {
    const newData = { selectedElement: props.selectedElement, entityNames: data.entityNames, eventNames: data.eventNames };
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

  const handleBooleanChange = (e) => {
    const targetName = e.target.name;
    const newValue = e.target.checked ? 'true' : 'false';
  
    setData((prevData) => {
      const newSelectedElement = {
        ...prevData.selectedElement,
        [targetName]: newValue,
      };
      return {
        ...prevData,
        selectedElement: newSelectedElement,
      };
    });
  };

  const addChapterEventIdToChildren = (newEventId, selectedElementId) => {	
    schema_json['events'].forEach(element => {	
      if (element['@id'] === selectedElementId) {	
        if (!element.children) {	
          element.children = [newEventId];	
        } else {	
          element.children.push(newEventId);	
        }	
      }	
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
  
    // console.log("\n(GRAPHEDIT.JSX) The node data from handleSubmit:\n", node_data);
  
    // change sidebar internal id if the id is changed
    if (e.target.id === '@id') {
      data.selectedElement['id'] = e.target.value;
      setData({ ...data });
      // console.log("(GRAPHEDIT.JSX) Selected element id updated to:", data.selectedElement['id']);
    }
  
    // Determine which action to take based on the props
    if (props.action === "addOutlink") {
      // Add outlink to selected element
    } else {
      // Update element fields
      // props.sideEditorCallback(node_data);
  
      // Update the events list in the schema JSON with the new chapter event
      if (node_data.updatedFields.name) {
        // console.log("(GRAPHEDIT.JSX) Sending chapter event to server:", data.selectedElement);
        axios.post("/add_event", data.selectedElement)
          .then(res => {
            console.log("Response from server: ", res.data);
            props.callbackFunction(res.data); // or props.updateCallback(res.data);
          })
          .catch(err => {
            console.error(err);
          });
      }
    }
  
    handleClose();
  };
  
  const handleClose = () => {
    // close the dialog
    // console.log("Closing dialog");
    // console.log("Type of onClose: ", typeof props.onClose);
    setOpen(false);
  };

  let i = 0;
  const excluded_ids = ['id', '_label', '_type', '_shape', '_edge_type', 'child','outlinks', 'relations', 'children_gate', 'key', 'modality']
  const selectedElement = data.selectedElement || {};

  return (
    <Dialog open={open} onClose={handleClose} ref={ref} maxWidth={false} classes={{ paper: classes.halfWidthDialog }} PaperComponent={PaperComponent}>
      <DialogTitle id="draggable-dialog-title" className={classes.dialogTitle}>{isEmpty(data) ? "" : data.selectedElement?.["_label"]}</DialogTitle>
      <DialogContent>
          {isEmpty(data) ? (
          ""
          ) : (
          <DialogContentText>
              Edit the properties of {data.selectedElement?.["_label"]}.
          </DialogContentText>
          )}
          <form noValidate autoComplete="off">
            <Box display="flex" flexDirection="column" justifyContent="space-between" minHeight="200px">
              {data.selectedElement && Object.entries(data.selectedElement).map(([key, val]) => {
                if (excluded_ids.includes(key) || ['participants', 'children', 'entities'].includes(key)) return null;
                return (
                  <Box flexGrow={1} key={key}>
                    {isBoolean(val) ? (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={val}
                            onChange={handleBooleanChange}
                            name={key}
                            color="primary"
                          />
                        }
                        label={key}
                      />
                    ) : (
                      <TextField
                        autoFocus
                        margin="dense"
                        label={key}
                        type="text"
                        fullWidth
                        name={key}
                        value={
                          (Array.isArray(val) && key !== "wd_node" && key !== "children") 
                          ? val.map(v => v["name"] || v["@id"]).join(", ") 
                          : val
                        }
                        onChange={handleChange}
                        multiline={key === 'description' || key === 'wd_description'} // Enable multiline for the 'description' and 'wd_description' fields
                        className={(key === 'description' || key === 'wd_description') ? classes.multilineInput : null} // Apply the multiline styles to the 'description' and 'wd_description' fields
                      />
                    )}
                  </Box>
                )
              })}
              {data.selectedElement && ['entities', 'participants', 'children'].map((key) => {
                const val = data.selectedElement[key];
                if (val && val.length > 0) {
                  return (
                    <Box key={key}>
                      <Typography className={classes.header}>{_.capitalize(key)}</Typography>
                      <Typography>{val.map(v => (v["@id"] || v["name"]) ? (v["name"] || data.entityNames[v["@id"]] || data.eventNames[v["@id"]] || v["@id"]) : v).join(", ")}</Typography>
                    </Box>
                  );
                } else {
                  return null;
                }
              })}
            </Box>
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