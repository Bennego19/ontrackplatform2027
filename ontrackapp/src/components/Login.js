import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/authMiddleware';
import { tokenManager } from '../services/authMiddleware';
import loginPortrait from './home.jpeg';
import './Dashboard.css'; // Reuse the CSS

const Login = () => {
  const navigate = useNavigate();
  
  // Login form state
  const [activeTab, setActiveTab] = useState('admin');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      } else {
        response = await authAPI.login(credentials.username, credentials.password);
      }

      if (response.success) {
        tokenManager.setToken(response.token);
        tokenManager.setStoredUser(response.user);

        // Redirect based on role
        if (response.user.role === 'admin' || response.user.role === 'superadmin') {
          navigate('/dashboard');
        } else {
          navigate('/userdashboard');
        }
      } else {
        setLoginError(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Login failed. Please try again.');
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
      <div className="login-container">
        <section className="login-visual" aria-hidden="true">
                 <div className="login-portrait">
            <img
                     src={loginPortrait}
              alt=""
            />
          </div>
          <p className="login-visual-copy">Learn with purpose.<br />Move with confidence.</p>
          <div className="copyright">
            © {new Date().getFullYear()} OnTrack Connect. All rights reserved.
          </div>
        </section>

        <section className="login-panel">
          <div className="login-brand">
           
            <span>OnTrack Connect</span>
          </div>

          <div className="login-tabs" role="tablist" aria-label="Account type">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'admin'}
              className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'student'}
              className={`tab-button ${activeTab === 'student' ? 'active' : ''}`}
              onClick={() => setActiveTab('student')}
            >
              Student
            </button>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-form-heading">
              <h1>Login</h1>
              <p>Enter your credentials to access your account</p>
            </div>

            {loginError && <div className="error-message">{loginError}</div>}

            <div className="form-group">
              <label htmlFor="username">Email</label>
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                required
                disabled={isLoggingIn}
                placeholder="example@email.com"
              />
            </div>

            <div className="form-group password-group">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoggingIn}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="forgot-password">
                <a className="forgot-link" href="/forgot-password">Forgot Password?</a>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={isLoggingIn}>
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="login-divider"><span>OR</span></div>
           

            <p className="signup-section">
              Don&apos;t have an account? <a className="signup-link" href="/signup">Sign Up</a>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;