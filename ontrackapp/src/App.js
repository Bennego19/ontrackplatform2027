// ======================
// REFACTORED: ontrackapp/src/App.js
// ======================

import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import SignUp from "./components/signup";
import Login from "./components/Login";
import Dashboard from './components/dashboard';
import CreateMentor from './components/creatementor';
import Createassessment from './components/createassessment';
import StudentAssignment from './components/studentassignment';
import OnboardStudent from './components/onboardstudent';
import OnboardMentor from './components/onboardmentor';
import AssignMentor from './components/mentorassignment';
import Managementorship from './components/managementorship';
import ManageInternship from './components/manageinternship';
import ManageSkillDevelopment from './components/manageskilldevelopment';
import ManageGraduate from './components/managegraduate';
import Userdashboard from './components/userdashboard';
import MentorDashboard from './components/mentordashboard';
import ManageResources from './components/manageresources';
import AdminAnnouncements from './components/AdminAnnouncements';
import Notices from './components/Notices';
import Events from './components/events';
import HelpRequests from './components/HelpRequests';
import { authAPI, tokenManager } from './services/authMiddleware';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const navigate = useNavigate();
  const [authStatus, setAuthStatus] = useState('checking');
  
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Use the correct verify endpoint
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenManager.getToken()}`
          },
          body: JSON.stringify({ token: tokenManager.getToken() })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          tokenManager.clearAuth();
          navigate('/');
          return;
        }
        
        const user = data.user;
        
        if (requireAdmin && user?.role?.toLowerCase() !== 'admin') {
          navigate('/userdashboard');
          return;
        }
        
        setAuthStatus('authenticated');
      } catch (error) {
        console.error('Auth verification error:', error);
        tokenManager.clearAuth();
        navigate('/');
      }
    };
    
    verifyAuth();
  }, [navigate, requireAdmin]);
  
  if (authStatus === 'checking') {
    return <div>Loading...</div>;
  }
  
  return children;
};

const App = () => {
  return (
    <div>
      <Routes>
        {/* Landing page - Shows dual login form */}
        <Route path="/" element={<Login />} />
        
        {/* Login route - same as default */}
        <Route path="/login" element={<Login />} />
        
        {/* Admin dashboard - Only shows when authenticated as admin */}
        <Route path="/dashboard" element={
          <ProtectedRoute requireAdmin={true}>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* User dashboard for students */}
        <Route path="/userdashboard" element={
          <ProtectedRoute>
            <Userdashboard />
          </ProtectedRoute>
        } />
        
        {/* SignUp route - public */}
        <Route path="/SignUp" element={<SignUp />} />
        
        {/* Redirect old SignIn route */}
        <Route path="/SignIn" element={<Navigate to="/" replace />} />
        
        {/* Admin-only protected routes */}
        <Route path="/CreateMentor" element={
          <ProtectedRoute requireAdmin={true}>
            <CreateMentor />
          </ProtectedRoute>
        } />
        <Route path="/Createassessment" element={
          <ProtectedRoute requireAdmin={true}>
            <Createassessment />
          </ProtectedRoute>
        } />
        <Route path="/studentassignment" element={
          <ProtectedRoute requireAdmin={true}>
            <StudentAssignment />
          </ProtectedRoute>
        } />
        <Route path="/onboardstudent" element={
          <ProtectedRoute requireAdmin={true}>
            <OnboardStudent />
          </ProtectedRoute>
        } />
        <Route path="/onboardmentor" element={
          <ProtectedRoute requireAdmin={true}>
            <OnboardMentor />
          </ProtectedRoute>
        } />
        <Route path="/assignmentor" element={
          <ProtectedRoute requireAdmin={true}>
            <AssignMentor />
          </ProtectedRoute>
        } />
        <Route path="/managementorship" element={
          <ProtectedRoute requireAdmin={true}>
            <Managementorship/>
          </ProtectedRoute>
        }/>
        <Route path="/manageinternship" element={
          <ProtectedRoute requireAdmin={true}>
            <ManageInternship/>
          </ProtectedRoute>
        }/>
        <Route path="/manageskilldevelopment" element={
          <ProtectedRoute requireAdmin={true}>
            <ManageSkillDevelopment/>
          </ProtectedRoute>
        }/>
        <Route path="/managegraduate" element={
          <ProtectedRoute requireAdmin={true}>
            <ManageGraduate/>
          </ProtectedRoute>
        }/>
        <Route path="/mentordashboard" element={
          <ProtectedRoute requireAdmin={true}>
            <MentorDashboard/>
          </ProtectedRoute>
        }/>
        <Route path="/resources" element={
          <ProtectedRoute requireAdmin={true}>
            <ManageResources/>
          </ProtectedRoute>
        }/>
        <Route path="/announcements" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminAnnouncements/>
          </ProtectedRoute>
        } />
        
        {/* Mixed access routes */}
        <Route path="/notices" element={
          <ProtectedRoute>
            <Notices/>
          </ProtectedRoute>
        } />
        <Route path="/help-requests" element={
          <ProtectedRoute>
            <HelpRequests/>
          </ProtectedRoute>
        } />
        <Route path="/events" element={
          <ProtectedRoute>
            <Events/>
          </ProtectedRoute>
        } />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
