import React, { Component } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Input, Label, Form, FormGroup } from 'reactstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Button from '@mui/material/Button';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import axios from 'axios';

/* Upload modal to upload JSON file.
   Shows a pop-up window. */

class UploadModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false,
      selectedFile: null,
      valid: false
    }
    this.toggle = this.toggle.bind(this);
    this.onChangeHandler = this.onChangeHandler.bind(this);
    this.checkMimeType = this.checkMimeType.bind(this);
    this.maxSelectFile = this.maxSelectFile.bind(this);
    this.checkFileSize = this.checkFileSize.bind(this);
    this.onClickHandler = this.onClickHandler.bind(this);
  }

  toggle() {
    this.setState({
      modal: !this.state.modal,
      selectedFile: null,
      valid: false
    })
  }

  checkMimeType(event) {
    /*
    Checks whether the selected file has the correct type.
    If not, throws a toast error and discards the file.
    */

    //getting file object
    let files = event.target.files;
    //define message container
    let err = [];
    // list allow mime type
    const types = ['application/ld+json', 'application/json', 'text/plain'];
    // loop access array
    for (var x = 0; x < files.length; x++) {
      // compare file type find doesn't matach
      if (types.every(type => files[x].type !== type)) {
        // create error message and assign to container   
        err[x] = files[x].type + ' is not a supported format\n';
      }
    };
    for (var z = 0; z < err.length; z++) {// if message not same old that mean has error 
      // discard selected file
      toast.error(err[z]);
      event.target.value = null;
    }
    return err.length === 0;
  }

  maxSelectFile(event) {
    /* 
    Warns the user if they try to upload more than one file.
    If so, throws a warning and discards all files.
    */

    let files = event.target.files;
    if (files.length > 1) {
      const msg = 'Only 1 file can be uploaded at a time';
      event.target.value = null;
      toast.warn(msg);
      return false;
    }
    return true;
  }

  checkFileSize(event) {
    /*
    Checks whether file size is too large.
    If so, throws an error and discards the file.
    */
  
    let files = event.target.files;
    let size = 2000000;
    let err = [];
    for (var x = 0; x < files.length; x++) {
      if (files[x].size > size) {
        err[x] = files[x].name.substring(0, 10) + ' is too large, please pick a smaller file\n';
      }
    };
    for (var z = 0; z < err.length; z++) {// if message not same old that mean has error 
      // discard selected file
      toast.error(err[z]);
      event.target.value = null;
    }
    if (err.length > 0) {
      this.setState({ valid: false });
    }
    return err.length === 0;
  }

  onChangeHandler(event) {
    /*
    Checks the file is valid, then changes state.
    */

    var files = event.target.files;
    if (this.maxSelectFile(event) && this.checkMimeType(event) && this.checkFileSize(event)) {
      // if return true allow to setState
      this.setState({
        selectedFile: files,
        valid: true
      });
    } else {
      this.setState({ valid: false });
      setTimeout(toast.dismiss, 4000);
    }
  }

  onClickHandler() {
    /*
    Handles green upload button.
    Shows upload success or failure.
    If success, closes the sub window.
    */

    const data = new FormData();
    for (var x = 0; x < this.state.selectedFile.length; x++) {
      data.append('file', this.state.selectedFile[x]);
    }
    axios.post("/upload", data)
      .then(res => { // then print response status
        this.props.parentCallback(res.data)
        toast.success('Upload success');
        setTimeout(this.toggle, 1000);
      })
      .catch(err => { // then print response status
        this.setState({ valid: false });
        let error = err.response.data;
        let error_title = error.slice(error.indexOf("<title>") + 7, error.lastIndexOf("</title>"));
        let error_notif = error_title.slice(0, error_title.indexOf("//"));
        if (error_notif.includes('root_node'))
          error_notif = "UnboundLocalError: Root node not found.\nPlease make sure you have a root node that has an 'or' children_gate for hierarchy visualization.";
        toast.error(error_notif);
      });
  }

  render() {
    /*
    Opens up a sub window when Upload Schema button is pressed,
    where you can upload a file or cancel.
    Checks the validity of the file.
    */

    const openModal = () => {
      document.getElementById("btn-modal").blur();
      this.toggle();
    }

    return (
      <div>
        <div style={{ 'display': 'flex', 'justifyContent': 'center' }}>
          <Button id="btn-modal" variant="contained" endIcon={<UploadFileIcon />} onClick={openModal}>
            {this.props.buttonLabel}
          </Button>
        </div>
        <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
          <ToastContainer theme="colored" />
          <ModalHeader toggle={this.toggle}>Upload Schema</ModalHeader>

          <ModalBody>
            <Form>
              <FormGroup className="files">
                <Label>Upload Your File</Label>
                <Input type="file" className="form-control" style={{ height: 'auto' }} onChange={this.onChangeHandler} />
              </FormGroup>
            </Form>
          </ModalBody>

          <ModalFooter>
            <Button variant="contained" disabled={!this.state.valid} onClick={this.onClickHandler} endIcon={<UploadFileIcon />}>
              Upload
            </Button>
            {' '}
            <Button variant="outlined" color="info" onClick={this.toggle}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}

export default UploadModal;