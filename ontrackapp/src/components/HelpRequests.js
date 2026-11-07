import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css'; // Reuse dashboard styles
import './HelpRequests.css';
import AdminLogin from './adminlogin';
import { useDashboardApi } from '../hooks/useApi';
import { tokenManager } from '../services/authMiddleware';
import { authAPI } from '../services/authMiddleware';

const HelpRequests = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch help requests data
  const { data: helpRequestsData, loading: helpRequestsLoading, error: helpRequestsError, refetch } = useDashboardApi(isAuthenticated ? '/help-requests/admin' : null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(refetch, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refetch]);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = tokenManager.getToken();
        if (token) {
          // Verify token with backend
          const response = await authAPI.verifyToken();
          if (response.success && ['admin', 'superadmin'].includes(response.user?.role)) {
            setIsAuthenticated(true);
          } else {
            tokenManager.removeToken();
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        tokenManager.removeToken();
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Handle login success from AdminLogin component
  const handleLoginSuccess = (response) => {
    setIsAuthenticated(['admin', 'superadmin'].includes(response.user?.role));
    tokenManager.setToken(response.token);
  };

  // Handle logout
  const handleLogout = () => {
    tokenManager.removeToken();
    setIsAuthenticated(false);
    navigate('/');
  };

  // Help request action handlers
  const handleApproveRequest = async (requestId) => {
    try {
      const response = await fetch('/api/help-requests/approve', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        body: JSON.stringify({ id: requestId })
      });

      if (response.ok) {
        // Refresh the page to show updated data
        window.location.reload();
        alert('Help request approved successfully!');
      } else {
        alert('Failed to approve help request.');
      }
    } catch (error) {
      console.error('Error approving help request:', error);
      alert('Error approving help request.');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const response = await fetch('/api/help-requests/reject', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        body: JSON.stringify({ id: requestId })
      });

      if (response.ok) {
        // Refresh the page to show updated data
        window.location.reload();
        alert('Help request rejected.');
      } else {
        alert('Failed to reject help request.');
      }
    } catch (error) {
      console.error('Error rejecting help request:', error);
      alert('Error rejecting help request.');
    }
  };

  const handleResolveRequest = async (requestId) => {
    try {
      const response = await fetch('/api/help-requests/resolve', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        body: JSON.stringify({ id: requestId })
      });

      if (response.ok) {
        // Refresh the page to show updated data
        window.location.reload();
        alert('Help request marked as resolved!');
      } else {
        alert('Failed to resolve help request.');
      }
    } catch (error) {
      console.error('Error resolving help request:', error);
      alert('Error resolving help request.');
    }
  };

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">OnTrack Connect</h1>
        <h2 className="dashboard-subtitle">Help Requests Management</h2>
        <div className="header-actions">
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            Logout
          </button>
          <button
            className="back-btn"
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Loading Overlay */}
      {helpRequestsLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">Loading help requests...</p>
        </div>
      )}
      {helpRequestsError && <p role="alert">{helpRequestsError}</p>}

      <div className="dashboard-content">
        {/* Help Requests Management Section */}
        <div className="help-requests-section">
          <div className="section-header">
            <h3>Help Requests Management</h3>
            <div className="section-actions">
              <span className="auto-refresh-info">Auto-refreshes every 60 seconds</span>
            </div>
          </div>

          {helpRequestsData && helpRequestsData.length > 0 ? (
            <div className="help-requests-grid">
              {helpRequestsData.map((request) => (
                <div className="help-request-card" key={request.id}>
                  <div className="request-header">
                    <h4>{request.topic}</h4>
                    <span className={`status-badge ${request.status}`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="request-details">
                    <p className="area"><strong>Area:</strong> {request.area}</p>
                    <p className="description">{request.description}</p>
                    <p className="created-by">
                      <strong>By:</strong> {request.createdBy.name} ({request.createdBy.email})
                    </p>
                    <p className="availability">
                      <strong>Availability:</strong> {request.availability || 'Not specified'}
                    </p>
                    <p className="contact">
                      <strong>Contact:</strong> {request.contactPreference || 'Not specified'}
                    </p>
                    <p className="helpful-count">
                      <strong>Helpful:</strong> {request.helpfulCount} times
                    </p>
                    <p className="created-at">
                      <strong>Created:</strong> {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="request-actions">
                    {request.status === 'open' && (
                      <>
                        <button
                          className="approve-btn"
                          onClick={() => handleApproveRequest(request.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {request.status === 'approved' && (
                      <button
                        className="resolve-btn"
                        onClick={() => handleResolveRequest(request.id)}
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-requests">
              <p>No help requests found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpRequests;
