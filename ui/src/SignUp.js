// SignUp.js
import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Alert, Box } from '@mui/material';

export default function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await Auth.signUp({
        username: form.email,
        password: form.password,
        attributes: { email: form.email, name: form.name }
      });
      setSuccess('Sign up successful! Check your email for the code.');
      setTimeout(() => navigate('/confirm'), 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container sx={{ mt: 4, maxWidth: 400 }}>
      <Typography variant="h4" gutterBottom>Create Account</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          name="name"
          label="Name"
          variant="outlined"
          sx={{ mb: 2 }}
          value={form.name}
          onChange={handleChange}
          required
        />
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
          helperText="Min 8 chars, uppercase, number & special"
          sx={{ mb: 2 }}
          value={form.password}
          onChange={handleChange}
          required
        />
        <Button fullWidth variant="contained" type="submit">Sign Up</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
    </Container>
  );
}
