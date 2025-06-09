import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Container, Typography, TextField, Button, List,
  ListItem, ListItemText, Alert, Box
} from '@mui/material'

export default function PriceTriggers() {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [zip, setZip] = useState('')
  const [triggers, setTriggers] = useState([])
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }

  const loadTriggers = () => {
    axios.get('/price-triggers/', { headers })
      .then(res => setTriggers(res.data))
      .catch(() => setError('You must be logged in to view triggers.'))
  }

  useEffect(() => {
    if (isLoggedIn) loadTriggers()
  }, [isLoggedIn])

  useEffect(() => {
    setAlerts([])
    triggers.forEach(t => {
      if (t.current_price != null) {
        const diff = t.current_price - t.target_price
        if (diff <= 0) {
          setAlerts(a => [...a, `${t.name}: 🎉 On sale! Save $${Math.abs(diff).toFixed(2)}`])
        } else {
          setAlerts(a => [...a, `${t.name}: 🔺 Above target by $${diff.toFixed(2)}`])
        }
      }
    })
  }, [triggers])

  const handleAdd = () => {
    if (!name.trim() || !target) {
      setError('Item name and target price required.')
      return
    }
    setError('')
    axios.post('/price-triggers/', {
      name,
      target_price: parseFloat(target),
      zip
    }, { headers }).then(() => {
      setName('')
      setTarget('')
      loadTriggers()
    }).catch(() => setError('Failed to set trigger. Are you logged in?'))
  }

  return (
    <Container sx={{ mt: 4, maxWidth: 600 }}>
      <Typography variant="h4" gutterBottom>Price Triggers</Typography>

      {!isLoggedIn && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You must be logged in to use price triggers.
        </Alert>
      )}

      {isLoggedIn && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField label="Item Name" value={name} onChange={e => setName(e.target.value)} fullWidth />
            <TextField label="ZIP" value={zip} onChange={e => setZip(e.target.value)} sx={{ width: 100 }} />
            <TextField label="Target $" value={target} onChange={e => setTarget(e.target.value)} sx={{ width: 120 }} />
            <Button variant="contained" onClick={handleAdd}>Add</Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {alerts.map((msg, i) => (
            <Alert key={i} severity={msg.includes('🎉') ? 'success' : 'warning'} sx={{ mb: 1 }}>
              {msg}
            </Alert>
          ))}

          <Typography variant="h6" sx={{ mt: 4 }}>Your Triggers</Typography>
          <List>
            {triggers.map(t => (
              <ListItem key={t.id} divider>
                <ListItemText
                  primary={t.name}
                  secondary={`Target: $${t.target_price.toFixed(2)} | Current: ${t.current_price != null ? `$${t.current_price.toFixed(2)}` : 'N/A'}`}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Container>
  )
}
