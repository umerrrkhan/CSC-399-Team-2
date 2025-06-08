// src/Recommendations.js
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
} from "@mui/material";
import { Link } from "react-router-dom";

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("https://market-basket-api.onrender.com/price-triggers/")
      .then((res) => {
        const triggers = res.data;
        return Promise.all(
          triggers.map((t) =>
            axios
              .get("https://market-basket-api.onrender.com/item-prices/", { params: { term: t.name } })
              .then((r) =>
                r.data
                  .filter(
                    (i) => Math.abs(i.kroger_price - t.target_price) <= 0.5
                  )
                  .map((i) => ({ name: i.name, kroger_price: i.kroger_price }))
              )
          )
        );
      })
      .then((arrays) => setRecs(arrays.flat()))
      .catch(() => setError("Failed to load recommendations."));
  }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Recommended Items
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography>
          Haven’t set any triggers?
          <Button component={Link} to="/triggers" size="small" sx={{ ml: 1 }}>
            Set Price Triggers
          </Button>
        </Typography>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <List>
        {recs.length > 0 ? (
          recs.map((item, i) => (
            <ListItem key={i} divider>
              <ListItemText
                primary={item.name}
                secondary={`$${item.kroger_price.toFixed(2)}`}
              />
            </ListItem>
          ))
        ) : (
          <Typography>No recommendations yet.</Typography>
        )}
      </List>
    </Container>
  );
}
