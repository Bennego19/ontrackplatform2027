import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authMiddleware';
import { tokenManager } from '../services/authMiddleware';
import { mentorAuthAPI } from '../services/mentorAuthMiddleware';
import './Dashboard.css'; // Reuse the CSS

const Login = () => {
  const navigate = useNavigate();
  
  // Login form state
  const [activeTab, setActiveTab] = useState('admin');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [credentials, setCredentials] = useState({ 
    username: '', 
    password: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      let response;
      if (activeTab === 'admin') {
        response = await authAPI.adminLogin(credentials.username, credentials.password);
      } else if (activeTab === 'mentor') {
        response = await mentorAuthAPI.login(credentials.username, credentials.password);
      } else {
        response = await authAPI.login(credentials.username, credentials.password);
      }

      if (response.success) {
        tokenManager.setToken(response.token);
        tokenManager.setStoredUser(response.user);

        // Redirect based on role
        if (activeTab === 'mentor') {
          navigate('/mentordashboard');
        } else if (response.user.role === 'admin' || response.user.role === 'superadmin') {
          navigate('/dashboard');
        } else {
          navigate('/userdashboard');
        }
      } else {
        setLoginError(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleInputChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="dashboard-login-page">
      <div className="login-header">
        <h1 className="login-title">OnTrack Connect</h1>
        <p className="login-subtitle">Welcome to your learning platform</p>
      </div>
      
      <div className="login-container">
        <div className="login-tabs">
          <button
            className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Admin Login
          </button>
          <button
            className={`tab-button ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveTab('student')}
          >
            Student Login
          </button>
          <button
            className={`tab-button ${activeTab === 'mentor' ? 'active' : ''}`}
            onClick={() => setActiveTab('mentor')}
          >
            Mentor Login
          </button>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {loginError && <div className="error-message">{loginError}</div>}
          
          <h3>{activeTab === 'admin' ? 'Admin' : activeTab === 'mentor' ? 'Mentor' : 'Student'} Login</h3>
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              required
              disabled={isLoggingIn}
              placeholder="Enter your username"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              required
              disabled={isLoggingIn}
              placeholder="Enter your password"
            />
          </div>
          
          <button
            type="submit"
            className="login-btn"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Logging in...' : `Login as ${activeTab === 'admin' ? 'Admin' : activeTab === 'mentor' ? 'Mentor' : 'Student'}`}
          </button>

      
        </form>
      </div>
      

      <div className="copyright">
        © {new Date().getFullYear()} OnTrack Connect. All rights reserved.
      </div>
    </div>
  );
};

export default Login;
