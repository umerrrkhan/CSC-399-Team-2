import React, { useState } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';

function ConfirmSignUp() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleConfirm = async () => {
    try {
      await Auth.confirmSignUp(email, code);
      alert('✅ Account confirmed! You can now log in.');
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to confirm sign up');
    }
  };

  return (
    <div className="container mt-4">
      <h2>Confirm Sign Up</h2>
      <input
        type="email"
        className="form-control my-2"
        placeholder="Email used to sign up"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="text"
        className="form-control my-2"
        placeholder="Verification code"
        value={code}
        onChange={e => setCode(e.target.value)}
      />
      <button className="btn btn-success" onClick={handleConfirm}>
        Confirm Account
      </button>
      {error && <div className="text-danger mt-2">{error}</div>}
    </div>
  );
}

export default ConfirmSignUp;
