import React from 'react';
import { useState } from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from "react-router-dom";

import Home from "./template/Home";
import Viewer from "./template/Viewer";
import MuiDrawer from './template/MuiDrawer';

import Button from '@mui/material/Button';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import IconButton from '@mui/material/IconButton';
import GitHubIcon from '@mui/icons-material/GitHub';
import HelpIcon from '@mui/icons-material/Help';
import MenuIcon from '@mui/icons-material/Menu';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './App.scss';

const theme = createTheme({
  palette: {
    primary: {
      light: '#757ce8',
      main: '#3f50b5',
      dark: '#002884',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ff7961',
      main: '#f44336',
      dark: '#ba000d',
      contrastText: '#000',
    },
  },
});

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [schemaJson, setSchemaJson] = useState({});

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleJsonEditCallback = (json) => {
    setSchemaJson(json);
  };

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <AppBar position="static">
          <Toolbar className="menu">
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              sx={{ mr: 2 }}
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h1"
              noWrap
              component="div"
              sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
            >
              <Button component={Link} to="/" color="inherit">
                Schema Curation Interface
              </Button>
            </Typography>
            <Typography
              variant="body1"
              noWrap
              component="div"
              sx={{ mt: 1, mr: 4 }}
            >
              <Button component={Link} to="/viewer">
                Viewer
              </Button>
            </Typography>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              sx={{ mr: 2 }}
            >
              <a
                target="_blank"
                rel="noopener"
                href="https://github.com/cu-clear/schema-interface"
              >
                <GitHubIcon />
              </a>
            </IconButton>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              sx={{ mr: 2 }}
            >
              <a
                target="_blank"
                rel="noopener"
                href="https://chrysographes.notion.site/Schema-Curation-Manual-018034f383a24f75a4c10fc378678d75"
              >
                <HelpIcon />
              </a>
            </IconButton>
          </Toolbar>
        </AppBar>
        <MuiDrawer open={drawerOpen} handleToggle={handleDrawerToggle} schemaJson={schemaJson} parentCallback={handleJsonEditCallback} />
      </ThemeProvider>
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route exact path="/viewer" element={<Viewer schemaJson={schemaJson} parentCallback={handleJsonEditCallback} />} />
      </Routes>
    </Router>
  );
}