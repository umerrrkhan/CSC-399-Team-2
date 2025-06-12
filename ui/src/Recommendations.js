import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Alert,
  Button,
  Box,
  CircularProgress
} from "@mui/material";
import { Link } from "react-router-dom";
import { Auth } from 'aws-amplify';

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔐 Get auth headers
  const authHeaders = async () => {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      return {
        headers: { Authorization: `Bearer ${token}` }
      };
    } catch (err) {
      console.error("🔒 Not logged in");
      return {};
    }
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const headers = await authHeaders();
        const res = await axios.get('/recommendations/', headers);
        setRecs(res.data);
      } catch (err) {
        console.error("🚫 Failed to load recommendations", err);
        setError('Failed to load recommendations.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Recommended Items
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography>
          Recommendations are based on your price triggers.
          <Button component={Link} to="/triggers" size="small" sx={{ ml: 1 }}>
            Manage Triggers
          </Button>
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : recs.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No recommendations yet. Try adding a few price triggers to get started.
        </Alert>
      ) : (
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
      )}
    </Container>
  );
}
