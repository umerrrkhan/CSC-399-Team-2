// src/App.js
import React, { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
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
  CircularProgress
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

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(u => {
        setUser(u)
        Auth.currentSession().then(session => {
          localStorage.setItem('token', session.getIdToken().getJwtToken())
        })
      })
      .catch(() => {
        setUser(null)
        localStorage.removeItem('token')
      })
  }, [])

  const handleLogout = async () => {
    await Auth.signOut()
    setUser(null)
    localStorage.removeItem('token')
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
              <Typography sx={{ mx: 2 }}>{`Welcome, ${user.attributes.name}`}</Typography>
              <Button onClick={handleLogout} color="secondary">Logout</Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/search" element={<Search />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/triggers" element={<PriceTriggers />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login onLogin={u => setUser(u)} />} />
        <Route path="/confirm" element={<ConfirmSignUp />} />
      </Routes>
    </>
  )
}

// Placeholder component for Search (since it wasn't included in the last message)
function Search() {
  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4">Search Page</Typography>
    </Container>
  )
}

export default App