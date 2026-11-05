// ======================
// REFACTORED: ontrackapp/src/App.js
// ======================

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import { tokenManager } from './services/authMiddleware';

const SignUp = lazy(() => import('./components/signup'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const Dashboard = lazy(() => import('./components/dashboard'));
const CreateMentor = lazy(() => import('./components/creatementor'));
const Createassessment = lazy(() => import('./components/createassessment'));
const StudentAssignment = lazy(() => import('./components/studentassignment'));
const OnboardStudent = lazy(() => import('./components/onboardstudent'));
const OnboardMentor = lazy(() => import('./components/onboardmentor'));
const AssignMentor = lazy(() => import('./components/mentorassignment'));
const Managementorship = lazy(() => import('./components/managementorship'));
const ManageInternship = lazy(() => import('./components/manageinternship'));
const ManageSkillDevelopment = lazy(() => import('./components/manageskilldevelopment'));
const ManageGraduate = lazy(() => import('./components/managegraduate'));
const Userdashboard = lazy(() => import('./components/userdashboard'));
const MentorDashboard = lazy(() => import('./components/mentordashboard'));
const ManageResources = lazy(() => import('./components/manageresources'));
const AdminAnnouncements = lazy(() => import('./components/AdminAnnouncements'));
const Notices = lazy(() => import('./components/Notices'));
const Events = lazy(() => import('./components/events'));
const HelpRequests = lazy(() => import('./components/HelpRequests'));

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false, requireMentor = false }) => {
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
        
        const role = user?.role?.toLowerCase();
        if ((requireAdmin && !['admin', 'superadmin'].includes(role)) || (requireMentor && role !== 'mentor')) {
          navigate(role === 'mentor' ? '/mentordashboard' : ['admin', 'superadmin'].includes(role) ? '/dashboard' : '/userdashboard');
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
  }, [navigate, requireAdmin, requireMentor]);
  
  if (authStatus === 'checking') {
    return <div>Loading...</div>;
  }
  
  return children;
};

const App = () => {
  useEffect(() => {
    // Remove caches written by older versions, which may contain private data.
    try {
      localStorage.removeItem('dashboardCache');
      localStorage.removeItem('publicApiCache');
    } catch { /* Storage may be unavailable. */ }
  }, []);
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        {/* Landing page - Shows dual login form */}
        <Route path="/" element={<Login />} />
        
        {/* Login route - same as default */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
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
          <ProtectedRoute requireMentor={true}>
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
          <ProtectedRoute requireAdmin={true}>
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
      </Suspense>
    </div>
  );
}

export default App;
