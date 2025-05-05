import './App.css';
import React, { useState } from 'react';
import axios from 'axios';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from 'react-router-dom';

function Home() {
  return (
    <div className="container mt-5 text-center">
      <h1 className="display-4 text-primary">🧺 Market Basket</h1>
      <p className="lead">Track and compare grocery prices across locations.</p>
    </div>
  );
}

function Search() {
  const [items, setItems]       = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSearch = () => {
    if (!searchText) {
      setError('Please enter a search term.');
      return;
    }
    setError('');
    setLoading(true);
    axios.get('/item-prices/', { params: { term: searchText } })
      .then(res => setItems(res.data))
      .catch(err => {
        console.error(err);
        setError('Failed to fetch data.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">Search Kroger</h2>
      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="e.g. apples"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      {error && <div className="text-danger mb-3">{error}</div>}
      <ul className="list-group">
        {items.length > 0 ? (
          items.map((it, i) => (
            <li key={i} className="list-group-item">
              <strong>{it.name}</strong> — Kroger: {it.kroger_price != null
                ? `$${it.kroger_price}`
                : 'N/A'}
            </li>
          ))
        ) : (
          <li className="list-group-item text-muted">
            {loading ? 'Loading…' : 'No results; try another term.'}
          </li>
        )}
      </ul>
    </div>
  );
}

function CompareGroceries() {
  const [comparisons, setComparisons] = useState([]);

  React.useEffect(() => {
    axios.get('/item-prices/', { params: { term: '' } })
      .then(res => setComparisons(res.data))
      .catch(console.error);
  }, []);

  return (
    <div className="container mt-4">
      <h2 className="mb-3">Compare Grocery Prices</h2>
      <ul className="list-group">
        {comparisons.map((item, idx) => (
          <li key={idx} className="list-group-item">
            <strong>{item.name}</strong><br />
            Kroger: {item.kroger_price != null
              ? `$${item.kroger_price}`
              : 'N/A'}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmitFeedback() {
  const [feedback, setFeedback]   = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    setSubmitted(true);
    setFeedback('');
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">Submit Feedback</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <textarea
            className="form-control"
            rows="4"
            placeholder="Your feedback here..."
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Submit
        </button>
        {submitted && (
          <div className="mt-3 text-success">
            ✅ Thank you for your feedback!
          </div>
        )}
      </form>
    </div>
  );
}

function App() {
  return (
    <Router>
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm mb-4 px-4">
        <Link className="navbar-brand" to="/">Market Basket</Link>
        <div className="navbar-nav">
          <Link className="nav-link" to="/search">Search</Link>
          <Link className="nav-link" to="/compare">Compare</Link>
          <Link className="nav-link" to="/feedback">Feedback</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/"      element={<Home />} />
        <Route path="/search"  element={<Search />} />
        <Route path="/compare" element={<CompareGroceries />} />
        <Route path="/feedback" element={<SubmitFeedback />} />
      </Routes>
    </Router>
  );
}

export default App;
