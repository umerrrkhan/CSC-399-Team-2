import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Amplify from 'aws-amplify';
import awsExports from './aws-exports';
import App from './App';
import reportWebVitals from './reportWebVitals';

Amplify.configure(awsExports);

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: { default: '#f8f9fa', paper: '#ffffff' }
  },
  typography: {
    fontFamily: ['Segoe UI','Tahoma','Geneva','Verdana','sans-serif'].join(',')
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

reportWebVitals();
