import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
  Box,
  CircularProgress
} from '@mui/material';
import { Auth } from 'aws-amplify';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

export default function PriceTriggers() {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [zip, setZip] = useState('');
  const [triggers, setTriggers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // ⬅️ New loading state

  const authHeaders = async () => {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      return {
        headers: { Authorization: `Bearer ${token}` }
      };
    } catch (err) {
      console.error("🔒 User not logged in", err);
      return {};
    }
  };

  const loadTriggers = async () => {
    setLoading(true); // ⬅️ Start loading
    try {
      const headers = await authHeaders();
      const res = await axios.get('/price-triggers/', headers);
      setTriggers(res.data);
    } catch {
      setError('Failed to load triggers.');
    } finally {
      setLoading(false); // ⬅️ Stop loading
    }
  };

  const handleDelete = async (id) => {
  try {
    const headers = await authHeaders();
    await axios.delete(`/price-triggers/${id}`, headers);
    loadTriggers(); // Refresh after delete
  } catch {
    setError('Failed to delete trigger.');
  }
};


  useEffect(() => {
    loadTriggers();
  }, []);

  useEffect(() => {
    setAlerts([]);
    triggers.forEach(t => {
      if (t.current_price != null) {
        const diff = t.current_price - t.target_price;
        if (diff <= 0) {
          setAlerts(a => [
            ...a,
            `${t.name}: 🎉 On sale! You save $${Math.abs(diff).toFixed(2)}`
          ]);
        } else {
          setAlerts(a => [
            ...a,
            `${t.name}: 🔺 Above target by $${diff.toFixed(2)}`
          ]);
        }
      }
    });
  }, [triggers]);

  const handleAdd = async () => {
    if (!name.trim() || !target) {
      setError('Item name and target price required.');
      return;
    }

    setError('');
    try {
      const headers = await authHeaders();
      await axios.post(
        '/price-triggers/',
        {
          name,
          target_price: parseFloat(target),
          zip
        },
        headers
      );
      setName('');
      setTarget('');
      loadTriggers();
    } catch {
      setError('Failed to set trigger.');
    }
  };

  return (
    <Container sx={{ mt: 4, maxWidth: 600 }}>
      <Typography variant="h4" gutterBottom>Price Triggers</Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Item Name"
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
        />
        <TextField
          label="ZIP"
          value={zip}
          onChange={e => setZip(e.target.value)}
          sx={{ width: 100 }}
        />
        <TextField
          label="Target $"
          value={target}
          onChange={e => setTarget(e.target.value)}
          sx={{ width: 120 }}
        />
        <Button variant="contained" onClick={handleAdd}>Add</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {alerts.map((msg, i) => (
        <Alert
          key={i}
          severity={msg.includes('🎉') ? 'success' : 'warning'}
          sx={{ mb: 1 }}
        >
          {msg}
        </Alert>
      ))}

      <Typography variant="h6" sx={{ mt: 4 }}>Your Triggers</Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
  {triggers.map(t => (
    <ListItem key={t.id} divider
      secondaryAction={
        <IconButton edge="end" onClick={() => handleDelete(t.id)} aria-label="delete">
          <DeleteIcon />
        </IconButton>
      }
    >
      <ListItemText
        primary={t.name}
        secondary={`Target: $${t.target_price.toFixed(2)}  |  Current: ${
          t.current_price != null ? `$${t.current_price.toFixed(2)}` : 'N/A'
        }`}
      />
    </ListItem>
  ))}
</List>
        
      )}
    </Container>
  );
}
