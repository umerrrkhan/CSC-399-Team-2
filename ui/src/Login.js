// Login.js
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Alert, Box } from '@mui/material';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const user = await Auth.signIn(form.email, form.password);
      const session = await Auth.currentSession();
      localStorage.setItem('token', session.getIdToken().getJwtToken());
      if (onLogin) onLogin(user);
      navigate('/search');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container sx={{ mt: 4, maxWidth: 400 }}>
      <Typography variant="h4" gutterBottom>Log In</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          name="email"
          type="email"
          label="Email"
          variant="outlined"
          sx={{ mb: 2 }}
          value={form.email}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          name="password"
          type="password"
          label="Password"
          variant="outlined"
          sx={{ mb: 2 }}
          value={form.password}
          onChange={handleChange}
          required
        />
            <Typography fontSize={16}>
          Email and Password are Case Sensetive
          </Typography><Typography fontSize={16}>
          Email and Password are Case Sensetive
          </Typography>
        <Button fullWidth variant="contained" type="submit">Log In</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Container>
  );
}
