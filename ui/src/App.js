// src/App.js
import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import axios from 'axios'
import { Auth } from 'aws-amplify'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material'

import SignUp from './SignUp'
import Login from './Login'
import ConfirmSignUp from './ConfirmSignUp'
import Recommendations from './Recommendations'
import PriceTriggers from './PriceTriggers'



axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'https://market-basket-api.onrender.com'

function Home({ user }) {
  return (
    <Box>
      <Container sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" color="primary" gutterBottom>🧺 Market Basket</Typography>
        <Typography variant="h5" color="textSecondary" paragraph>
          Simplify your grocery shopping with real-time price tracking and side-by-side comparisons.
        </Typography>
        {user ? (
          <Typography variant="h6">Welcome back, {user.attributes.name}!</Typography>
        ) : (
          <Button variant="contained" size="large" component={Link} to="/signup" sx={{ mt: 3 }}>
            Get Started
          </Button>
        )}
      </Container>

      <Container sx={{ py: 6 }}>
        <Typography variant="h4" align="center" gutterBottom>Our Services [BETA]</Typography>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>🔍 Search Prices</Typography>
                <Typography variant="body2" color="textSecondary">
                  Find Kroger prices by keyword.
                </Typography>
              </CardContent>
              <CardActions sx={{ mt: 'auto' }}>
                <Button size="small" component={Link} to="/search">Learn More</Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>📊 Recommendations</Typography>
                <Typography variant="body2" color="textSecondary">
                  Items matching your price triggers.
                </Typography>
              </CardContent>
              <CardActions sx={{ mt: 'auto' }}>
                <Button size="small" component={Link} to="/recommendations">Learn More</Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>🔔 Price Triggers</Typography>
                <Typography variant="body2" color="textSecondary">
                  Set alerts for your target prices.
                </Typography>
              </CardContent>
              <CardActions sx={{ mt: 'auto' }}>
                <Button size="small" component={Link} to="/triggers">Learn More</Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}


function Search() {
  const [items, setItems] = useState([])
  const [searchText, setSearchText] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')


const handleSearch = async () => {
  const term = searchText.trim()
  if (!term) {
    setError('Please enter a search term.')
    return
  }

  try {
    setError('')
    setItems([])
    setLoading(true)
    console.log('🔎 Searching for:', { term, zip: zipCode })

    const response = await axios.get('/item-prices/', {
      params: { term, zip: zipCode.trim() || undefined }
    })

    console.log('✅ API response:', response.data)
    if (!Array.isArray(response.data)) {
      throw new Error('Unexpected response format')
    }

    setItems(response.data)

    if (response.data.length === 0) {
      setError('No items returned from API.')
    } else {
      // ✅ Save search term only if results exist
      try {
        await axios.post('/search-terms/', { term })
        console.log('📌 Search term saved:', term)
      } catch (e) {
        console.error('Failed to save search term', e)
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
      })
    } else {
      console.error('❌ Unknown error:', err)
    }
    setError('Failed to fetch items.')
  } finally {
    setLoading(false)
  }
}


  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Search Kroger</Typography>
      <Typography fontSize={16} gutterBottom>Optional ZIP filters to nearest store</Typography>

      <Box sx={{ display: 'flex', mb: 2, gap: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="e.g. apples"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <TextField
          sx={{ width: 120 }}
          variant="outlined"
          placeholder="ZIP"
          value={zipCode}
          onChange={e => setZipCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="contained" onClick={handleSearch} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Search'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <List>
        {items.length > 0 ? (
          items.map((it, i) => (
            <ListItem key={i} divider>
              <ListItemText
                primary={it.name}
                secondary={`$${it.kroger_price.toFixed(2)}`}
              />
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText primary={loading ? 'Loading…' : 'No results; try another term.'} />
          </ListItem>
        )}
      </List>
    </Container>
  )
}

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(u => setUser(u))
      .catch(() => setUser(null))
  }, [])

  useEffect(() => {
  const requestInterceptor = axios.interceptors.request.use(async (config) => {
    try {
      const session = await Auth.currentSession()
      const token = session.getIdToken().getJwtToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {
      // Not logged in, no token
    }
    return config
  })

  return () => {
    axios.interceptors.request.eject(requestInterceptor)
  }
}, [])



  const handleLogout = async () => {
    await Auth.signOut()
    setUser(null)
  }

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}
          >
            🧺 Market Basket
          </Typography>
          <Button component={Link} to="/search" color="inherit">Search</Button>
          <Button component={Link} to="/recommendations" color="inherit">Recommendations</Button>
          <Button component={Link} to="/triggers" color="inherit">Price Triggers</Button>
          {!user ? (
            <>
              <Button component={Link} to="/signup" color="inherit">Sign Up</Button>
              <Button component={Link} to="/login" color="inherit">Login</Button>
            </>
          ) : (
            <>
              {/* <Typography sx={{ mx: 2 }}>'Welcome, ${user.attributes.name}'</Typography> */}
              <Typography sx={{ mx: 2 }}>Welcome, {user.attributes.name}</Typography>

              <Button onClick={handleLogout} color="secondary">Logout</Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/search" element={<Search />} />
        <Route path="/recommendations" element={user ? <Recommendations /> : <Navigate to="/login" />} />
        <Route path="/triggers" element={user ? <PriceTriggers user={user} /> : <Navigate to="/login" />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login onLogin={u => setUser(u)} />} />
        <Route path="/confirm" element={<ConfirmSignUp />} />
      </Routes>
    </>
  )
}

export default App
