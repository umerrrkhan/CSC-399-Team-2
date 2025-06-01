// App.js
import React, { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { Auth } from 'aws-amplify';
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
} from '@mui/material';

import SignUp from './SignUp';
import Login from './Login';
import ConfirmSignUp from './ConfirmSignUp';

function Home({ user }) {
  return (
    <Box>
      {/* Hero Intro */}
      <Container sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" color="primary" gutterBottom>
          🧺 Market Basket
        </Typography>
        <Typography variant="h5" color="textSecondary" paragraph>
          Simplify your grocery shopping with real-time price tracking and side-by-side comparisons.
        </Typography>
        {user ? (
          <Typography variant="h6">Welcome back, {user.attributes.name}!</Typography>
        ) : (
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/signup"
            sx={{ mt: 3 }}
          >
            Get Started
          </Button>
        )}
      </Container>

      {/* Beta Services */}
      <Container sx={{ py: 6 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Our Services [BETA]
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🔍 Search Prices
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Quickly find the latest item prices at Kroger by keyword.
                </Typography>
              </CardContent>
              <CardActions sx={{ mt: 'auto' }}>
                <Button size="small" component={Link} to="/search">
                  Learn More
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Recommended Items
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  See multiple item recommmendations for your favorite grocery items.
                </Typography>
              </CardContent>
              <CardActions sx={{ mt: 'auto' }}>
                <Button size="small" component={Link} to="/compare">
                  Learn More
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💬 Submit Feedback
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Let us know what you think and help shape Market Basket’s next features.
                </Typography>
              </CardContent>
              <CardActions sx={{ mt: 'auto' }}>
                <Button size="small" component={Link} to="/feedback">
                  Learn More
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ py: 3, textAlign: 'center', bgcolor: 'background.paper' }}>
        <Typography variant="body2" color="textSecondary">
          © 2025 Market Basket. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}

function Search() {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = () => {
    if (!searchText) {
      setError('Please enter a search term.');
      return;
    }
    setError('');
    setLoading(true);
    axios
      .get('http://localhost:8000/item-prices/', { params: { term: searchText } })
      .then(res => setItems(res.data))
      .catch(() => setError('Failed to fetch data.'))
      .finally(() => setLoading(false));
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Search Kroger
      </Typography>
  <Typography fontSize={16} gutterBottom>Search for terms such as "Apples"</Typography>
      <Box sx={{ display: 'flex', mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="e.g. apples"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="contained" sx={{ ml: 2 }} onClick={handleSearch} disabled={loading}>
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
                secondary={`Kroger: ${it.kroger_price != null ? `$${it.kroger_price}` : 'N/A'}`}
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
  );
}

function CompareGroceries() {
  const [comparisons, setComparisons] = useState([]);

  useEffect(() => {
    axios
      .get('http://localhost:8000/item-prices/', { params: { term: '' } })
      .then(res => setComparisons(res.data))
      .catch(() => {});
  }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        See Recommended Grocery Items
      </Typography>
  <Typography variant="12px" gutterBottom>
    Below are recommended items based on what you have searched for in the past
  </Typography>
      <List>
        {comparisons.map((item, idx) => (
          <ListItem key={idx} divider>
            <ListItemText
              primary={item.name}
              secondary={`Kroger: ${item.kroger_price != null ? `$${item.kroger_price}` : 'N/A'}`}
            />
          </ListItem>
        ))}
      </List>
    </Container>
  );
}

function SubmitFeedback() {
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    setSubmitted(true);
    setFeedback('');
  };

  return (
    <Container sx={{ mt: 4, maxWidth: 600 }}>
      <Typography variant="h4" gutterBottom>
        Submit Feedback
      </Typography>
  <Typography variant="body1" gutterBottom>
      Let us know what you think and help shape Market Basket’s next features! Feel free to leave your name and email address and we would love to get back to you!
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Your feedback here..."
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          Submit
        </Button>
        {submitted && <Alert severity="success" sx={{ mt: 2 }}>✅ Thank you for your feedback!</Alert>}
        <Typography variant='body2' paddingTop={2} sx={{color: '#3b3b3b'}}>
        ⚠️ Do not leave any sensetive information in the feedback form!
        </Typography>
      </Box>
    </Container>
  );
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(u => setUser(u))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await Auth.signOut();
    setUser(null);
  };

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
          <Button component={Link} to="/compare" color="inherit">Recommended Items</Button>
          <Button component={Link} to="/feedback" color="inherit">Feedback</Button>
          {!user && (
            <>
              <Button component={Link} to="/signup" color="inherit">Sign Up</Button>
              <Button component={Link} to="/login" color="inherit">Login</Button>
            </>
          )}
          {user && (
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
        <Route path="/compare" element={<CompareGroceries />} />
        <Route path="/feedback" element={<SubmitFeedback />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login onLogin={u => setUser(u)} />} />
        <Route path="/confirm" element={<ConfirmSignUp />} />
      </Routes>
    </>
  );
}

export default App;
