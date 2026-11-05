import React from 'react';
import { Link } from 'react-router-dom';
import './Signup.css';

export default function SignUp() {
  return <main className="signup-container"><div className="signup-wrapper"><div className="signup-card">
    <div className="signup-header"><h1>OnTrack Connect</h1></div>
    <div className="signup-form-section">
      <h2>Request an account</h2>
      <p>Ask your program administrator to create your account.</p>
      <Link to="/">Return to sign in</Link>
    </div>
  </div></div></main>;
}
