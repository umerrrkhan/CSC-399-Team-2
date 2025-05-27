import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const user = await Auth.signIn(form.email, form.password);
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      localStorage.setItem("token", token); // Store token for backend use

      if (onLogin) onLogin(user); // Trigger optional callback
      navigate('/search');
    } catch (err) {
      console.error(err);
      setError(`❌ ${err.message}`);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="form-control my-2"
          onChange={handleChange}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="form-control my-2"
          onChange={handleChange}
          required
        />
        <button className="btn btn-primary">Log In</button>
      </form>
      {error && <div className="text-danger mt-3">{error}</div>}
    </div>
  );
}

export default Login;
