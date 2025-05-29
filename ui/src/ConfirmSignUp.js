// ConfirmSignUp.js
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Alert, Box } from '@mui/material';

export default function ConfirmSignUp() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleConfirm = async () => {
    try {
      await Auth.confirmSignUp(email, code);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container sx={{ mt: 4, maxWidth: 400 }}>
      <Typography variant="h4" gutterBottom>Confirm Account</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          type="email"
          placeholder="Email"
          variant="outlined"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <TextField
          fullWidth
          placeholder="Verification Code"
          variant="outlined"
          value={code}
          onChange={e => setCode(e.target.value)}
        />
        <Button variant="contained" onClick={handleConfirm}>Confirm</Button>
        {error && <Alert severity="error">{error}</Alert>}
      </Box>
    </Container>
  );
}
