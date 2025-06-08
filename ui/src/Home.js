import React from 'react'
import { Container, Box, Typography, Button, Grid, Card, CardContent, CardActions } from '@mui/material'
import { Link } from 'react-router-dom'

export default function Home({ user }) {
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
          <Button variant="contained" size="large" component={Link} to="/signup">Get Started</Button>
        )}
      </Container>
      <Container sx={{ py: 6 }}>
        <Typography variant="h4" align="center" gutterBottom>Our Services [BETA]</Typography>
        <Grid container spacing={4} justifyContent="center">
          {[
            { icon: '🔍', title: 'Search Prices', desc: 'Find Kroger prices by keyword.', to: '/search' },
            { icon: '📊', title: 'Recommendations', desc: 'Items matching your triggers.', to: '/recommendations' },
            { icon: '🔔', title: 'Price Triggers', desc: 'Set alerts for your target prices.', to: '/triggers' }
          ].map((s, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{s.icon} {s.title}</Typography>
                  <Typography variant="body2" color="textSecondary">{s.desc}</Typography>
                </CardContent>
                <CardActions sx={{ mt: 'auto' }}>
                  <Button size="small" component={Link} to={s.to}>Learn More</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}
