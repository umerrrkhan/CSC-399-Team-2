import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';

function SignUp() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    email: '',
    name: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { username, password, email, name } = form;
      await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          name,
        },
      });
      setSuccess('Sign up successful! Please check your email for a verification code.');
      setTimeout(() => navigate('/confirm'), 1500);
    } catch (err) {
      setError(err.message || 'Error signing up');
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: 500 }}>
      <h2 className="mb-3">Create Account</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>Name</label>
          <input
            type="text"
            name="name"
            className="form-control"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label>Email (used as username)</label>
          <input
            type="email"
            name="email"
            className="form-control"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label>Password</label>
          <input
            type="password"
            name="password"
            className="form-control"
            value={form.password}
            onChange={handleChange}
            required
          />
          <small className="text-muted">
            Minimum 8 characters, 1 uppercase, 1 number, and 1 special character.
          </small>
        </div>
        <button className="btn btn-primary" type="submit">Sign Up</button>
      </form>
      {error && <div className="mt-3 text-danger">❌ {error}</div>}
      {success && <div className="mt-3 text-success">✅ {success}</div>}
    </div>
  );
}

export default SignUp;
