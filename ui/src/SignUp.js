import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';

function SignUp() {
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignUp = async e => {
    e.preventDefault();
    try {
      await Auth.signUp({
        username: form.email,
        password: form.password,
        attributes: {
          email: form.email,
          name: form.name
        }
      });
      setMessage('✅ Sign up successful! Please check your email for the confirmation code.');
      navigate('/confirm');
    } catch (err) {
      console.error(err);
      setMessage(`❌ ${err.message}`);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Sign Up</h2>
      <form onSubmit={handleSignUp}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="form-control my-2"
          onChange={handleChange}
          required
        />
        <input
          name="name"
          type="text"
          placeholder="Full Name"
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
        <button className="btn btn-success">Sign Up</button>
      </form>
      {message && <p className="mt-3">{message}</p>}
    </div>
  );
}

export default SignUp;
