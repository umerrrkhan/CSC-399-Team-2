import React, { useState } from 'react'
import {
  Container, Typography, Box, TextField,
  Button, CircularProgress, Alert,
  List, ListItem, ListItemText, Divider
} from '@mui/material'
import axios from 'axios'
import { Auth } from 'aws-amplify';

export default function Search() {
  const [items, setItems] = useState([])
  const [recs, setRecs] = useState([])
  const [searchText, setSearchText] = useState('')
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')


// 🔐 Helper to get Authorization headers
const authHeaders = async () => {
  try {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();
    return {
      headers: { Authorization: `Bearer ${token}` }
    };
  } catch (err) {
    console.warn("User not logged in; proceeding anonymously.");
    return {};
  }
};

const handleSearch = async () => {
  const term = searchText.trim();
  if (!term) {
    setError('Please enter a search term.');
    return;
  }

  try {
    setError('');
    setItems([]);
    setLoading(true);
    console.log('🔎 Searching for:', { term, zip: zipCode });

    const response = await axios.get('/item-prices/', {
      params: { term, zip: zipCode.trim() || undefined }
    });

    console.log('✅ API response:', response.data);
    if (!Array.isArray(response.data)) {
      throw new Error('Unexpected response format');
    }

    setItems(response.data);
    if (response.data.length === 0) {
      setError('No items returned from API.');
    }

    // ✅ Save search term (authenticated if possible)
    if (response.data.length > 0) {
      try {
        const headers = await authHeaders();
        await axios.post('/search-terms/', { term }, headers);
      } catch (e) {
        console.error('Failed to save search term', e);
      }
    }

  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('❌ Axios error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
        method: err.config?.method,
      });
    } else {
      console.error('❌ Unknown error:', err);
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Search Kroger</Typography>
      <Typography fontSize={16} gutterBottom>Optional ZIP → nearest store</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth placeholder="e.g. apples"
          value={searchText} onChange={e => setSearchText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <TextField
          sx={{ width: 120 }} placeholder="ZIP"
          value={zip} onChange={e => setZip(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="contained" onClick={handleSearch} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Search'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h6">Search Results</Typography>
      <List>
        {items.length > 0 ? items.map((it, i) =>
          <ListItem key={i} divider>
            <ListItemText primary={it.name} secondary={`$${it.kroger_price.toFixed(2)}`} />
          </ListItem>
        ) : (
          <ListItem>
            <ListItemText primary={loading ? 'Loading…' : 'No results.'} />
          </ListItem>
        )}
      </List>

      {recs.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6">You May Also Like</Typography>
          <List>
            {recs.map((item, i) => (
              <ListItem key={i} divider>
                <ListItemText
                  primary={item.name}
                  secondary={`$${item.kroger_price.toFixed(2)}`}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Container>
  )
}
