import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';
import { authAPI, tokenManager } from '../services/authMiddleware';

const AdminLogin = ({ onLoginSuccess }) => {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");

    try {
      const response = await authAPI.adminLogin(loginData.username, loginData.password);
      if (response.success) {
        // Ensure token and user are stored (authAPI also stores them)
        if (response.token) {
          tokenManager.setToken(response.token);
        }
        if (response.user) {
          tokenManager.setStoredUser(response.user);
        }

        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(response);
        }
        // navigate to admin dashboard route
        try {
          navigate('/admin-dashboard');
        } catch (e) {
          console.warn('Navigation to /admin-dashboard failed:', e);
        }
      } else {
        setLoginError(response.message || "Login failed");
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="login-container">
        <div className="login-form">
          <h1 className="login-title">OnTrack Connect</h1>
          <h2 className="login-subtitle">Admin Login</h2>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                required
                disabled={isLoading}
                placeholder="Enter your username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                disabled={isLoading}
                placeholder="Enter your password"
              />
            </div>

            <div className="forgot-password">
              <span className="forgot-link">Contact your administrator for account help.</span>
            </div>

            {loginError && (
              <div className="error-message">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <div className="signup-section">
              <p>Accounts are created by an administrator.</p>
            </div>

            <div className="copyright">
              <p>&copy; bylewebster.com</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
