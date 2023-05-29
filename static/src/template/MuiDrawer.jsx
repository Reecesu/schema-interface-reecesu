import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Drawer, Box, Typography, Divider } from '@mui/material';
import { useState } from 'react';
import JsonEdit from './JsonEdit';

const MuiDrawer = (props) => {
  const theme = useTheme();

  const handleJsonEditCallback = (json) => {
    console.log('JSON passed to MuiDrawer:', json);
    props.parentCallback(json); // Pass the edited JSON data back to the parent component
  };

  // Add a default value for the open prop
  const open = props.open || false;

  const Container = styled(Box)({
    width: "max-content",
    // Removed backgroundColor
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    justifyContent: 'flex-start'
  });

  return (
    <Drawer 
      open={open} 
      onClose={props.handleToggle} 
      anchor="right" 
      // PaperProps={{ 
      //   style: { 
      //     backgroundColor: 'rgba(0, 0, 0, 0)', 
      //     boxShadow: 'none'
      //   }, 
      // }}
    >
      <Container p={2}>
        <Typography variant="h6">
          JSON Editor
        </Typography>
        <Divider />
        <Box display="flex" flexDirection="column" justifyContent="flex-start" marginTop="20px">
          <JsonEdit schemaJson={props.schemaJson} parentCallback={handleJsonEditCallback} />
        </Box>
      </Container>
    </Drawer>
  );
};

export default MuiDrawer;
