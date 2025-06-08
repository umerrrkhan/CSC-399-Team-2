import React, { useState } from 'react'
import {
  Container, Typography, Box, TextField,
  Button, CircularProgress, Alert,
  List, ListItem, ListItemText
} from '@mui/material'
import axios from 'axios'

export default function Search() {
  const [items, setItems] = useState([])
  const [searchText, setSearchText] = useState('')
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    const term = searchText.trim()
    if (!term) { setError('Please enter a search term.'); return }
    setError(''); setItems([]); setLoading(true)
    try {
      const res = await axios.get('https://market-basket-api.onrender.com/item-prices/', { params: { term, zip: zip.trim() || undefined } })
      if (!Array.isArray(res.data)) throw new Error('Bad format')
      setItems(res.data)
      if (res.data.length === 0) setError('No items returned.')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Fetch failed.')
    } finally { setLoading(false) }
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Search Kroger</Typography>
      <Typography fontSize={16} gutterBottom>Optional ZIP → nearest store</Typography>
      <Box sx={{ display:'flex', gap:2, mb:2 }}>
        <TextField
          fullWidth placeholder="e.g. apples"
          value={searchText} onChange={e=>setSearchText(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleSearch()}
        />
        <TextField
          sx={{ width:120 }} placeholder="ZIP"
          value={zip} onChange={e=>setZip(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleSearch()}
        />
        <Button variant="contained" onClick={handleSearch} disabled={loading}>
          {loading? <CircularProgress size={24}/> : 'Search'}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
      <List>
        {items.length>0 ? items.map((it,i)=>
          <ListItem key={i} divider>
            <ListItemText primary={it.name} secondary={`$${it.kroger_price.toFixed(2)}`}/>
          </ListItem>
        ) : (
          <ListItem>
            <ListItemText primary={loading?'Loading…':'No results.'}/>
          </ListItem>
        )}
      </List>
    </Container>
  )
}
