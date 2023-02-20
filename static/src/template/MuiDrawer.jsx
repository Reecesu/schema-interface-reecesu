import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Drawer, Box, Typography, IconButton, ListItem, ListItemText, Divider, Button } from '@mui/material';
import JsonEdit from './JsonEdit';

const MuiDrawer = (props) => {
  const theme = useTheme();
  console.log("Looking for schemaJson in MuiDrawer:", props.schemaJson)
  const Container = styled(Box)({
    width: "max-content",
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    justifyContent: 'flex-start'
  });

  const [showJsonEditor, setShowJsonEditor] = React.useState(false);

  const toggleJsonEditor = () => {
    setShowJsonEditor(!showJsonEditor);
    // We need to pass the schemaJson to the JsonEdit component

  };

  const handleJsonEditCallback = (json) => {
    console.log('JSON passed to MuiDrawer:', json);
  };

  return (
    <Drawer open={props.open} onClose={props.handleToggle} anchor="right">
      <Container p={2}>
        <Typography variant="h6">
          Menu
        </Typography>
        <Divider />
        <Box display="flex" flexDirection="column" justifyContent="flex-start">
          <Button onClick={toggleJsonEditor}>Json Editor</Button>
          {showJsonEditor && <JsonEdit parentCallback={handleJsonEditCallback} schemaJson={props.schemaJson}/>}
          <Button>Grounding Tool</Button>
        </Box>
      </Container>
    </Drawer>
  );
};

export default MuiDrawer;