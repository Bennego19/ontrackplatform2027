import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authAPI, tokenManager } from "../services/authMiddleware";
import DocumentViewer from './DocumentViewer';

const UserDashboard = () => {
  // State management

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard-pane');
  const [resources, setResources] = useState([]);
  const [assignments, setAssignments] = useState([]); // ✅ FIX
  const [assessments, setAssessments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modules, setModules] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [assignedMentor, setAssignedMentor] = useState('To be assigned');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [helpRequests, setHelpRequests] = useState([]);
  const [helpRequestsLoading, setHelpRequestsLoading] = useState(false);
  const [newHelpRequest, setNewHelpRequest] = useState({ title: '', description: '', category: 'Technical' });
  const [submittingHelpRequest, setSubmittingHelpRequest] = useState(false);
  const [helpRequestError, setHelpRequestError] = useState('');


  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile sidebar toggle function
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Modal functions
  const openDocumentModal = (documentLink) => {
    setSelectedDocument(documentLink);
    setIsModalOpen(true);
  };

  const closeDocumentModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
  };

  const fetchNotices = async () => {
    setNoticesLoading(true);
    try {
      const token = tokenManager.getToken();
      const resp = await axios.get('/api/announcements', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setNotices(resp.data || []);
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setNoticesLoading(false);
    }
  };

  // Navigation configuration
  const navigationTabs = [
    { id: 'dashboard-pane', label: 'Dashboard', icon: '📊' },
    { id: 'courses-pane', label: 'Course Outline', icon: '📚' },
    { id: 'modules-pane', label: 'Modules', icon: '📖' },
    { id: 'resources-pane', label: 'Resources', icon: '📋' },
    { id: 'assignments-pane', label: 'Assignments', icon: '📝' },
    { id: 'assessments-pane', label: 'Assessments', icon: '📈' },
    { id: 'tasks-pane', label: 'Tasks', icon: '✅' },
    { id: 'projects-pane', label: 'Projects', icon: '🚀' },
    { id: 'help-pane', label: 'Help Requests', icon: '🆘' },
    { id: 'community-pane', label: 'My Community', icon: '👥' },
    { id: 'profile-pane', label: 'Profile', icon: '👤' },
    { id: 'notices-pane', label: 'Notices', icon: '📣' }
  ];

  // Helper functions
  const transformUserData = (backendData) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const registrationMonth = backendData.createdAt ?
      monthNames[new Date(backendData.createdAt).getMonth()] : "Not specified";

    return {
      name: `${backendData.name || ''} ${backendData.surname || ''}`.trim(),
      username: backendData.username,
      email: backendData.email,
      program: backendData.program,
      track: backendData.track,
      semester: backendData.semester || 'Not specified',
      registrationMonth: registrationMonth,
      studentId: backendData.username,
      cohort: backendData.cohort || 'Not specified',
      startDate: backendData.startDate || 'Not specified',
      cellnumber: backendData.cellnumber || "Not provided"
    };
  };

  // Fetch assigned mentor
  const fetchAssignedMentor = async () => {
    try {
      const mentorData = await authAPI.getStudentMentor();
      if (mentorData && mentorData.assignments && mentorData.assignments.length > 0) {
        // Get the first active mentor assignment for this student
        const activeAssignment = mentorData.assignments.find(assignment => assignment.mentor);
        if (activeAssignment && activeAssignment.mentor) {
          setAssignedMentor(activeAssignment.mentor.name || activeAssignment.mentor.email || 'Mentor Assigned');
        } else {
          setAssignedMentor('Not assigned yet');
        }
      } else {
        setAssignedMentor('Not assigned yet');
      }
    } catch (error) {
      console.error('Error fetching assigned mentor:', error);
      setAssignedMentor('Error loading mentor');
    }
  };

  // Authentication lifecycle
// Update the useEffect that initializes data
useEffect(() => {
  const initializeAuth = () => {
    const token = tokenManager.getToken();
    const storedUser = tokenManager.getStoredUser();
    if (token && storedUser) {
      setUserData(storedUser);
      setIsAuthenticated(true);
      fetchUserData();
      fetchUserResources();
      fetchUserTasks();
      fetchUserModules();
      fetchUserAssignments();
      fetchUserProjects();
      fetchUserAssessments();
      fetchNotices();
      fetchHelpRequests();
    }

  };
  initializeAuth();
  // Restore and load the current session once when the dashboard mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // Auto-refresh data every 30 seconds when authenticated
  useEffect(() => {
    let refreshInterval;
    if (isAuthenticated) {
      refreshInterval = setInterval(() => {
        fetchUserResources();
        fetchUserTasks();
        fetchUserModules();
        fetchUserAssignments();
        fetchUserProjects();
        fetchUserAssessments();
        fetchNotices();
        fetchAssignedMentor();
      }, 30000); // 30 seconds
    }
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated]);
  // Fetch mentor when userData is available
  useEffect(() => {
    if (userData) {
      fetchAssignedMentor();
    }
  }, [userData]);

  // API functions with improved error handling
  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userProfile = await authAPI.getProfile();
      const transformedData = transformUserData(userProfile);
      setUserData(transformedData);
      tokenManager.setStoredUser(transformedData);
    } catch (err) {
      console.error('Profile fetch error:', err);
      // Don't logout on profile fetch error - user is already authenticated
      // Just log the error and continue with stored user data
    } finally {
      setLoading(false);
    }
  };
// Add these new fetch functions for each type
const fetchUserModules = async () => {
  try {
    const data = await authAPI.getUserModules();
    setModules(data);
  } catch (err) {
    console.error('Error fetching modules:', err);
  }
};

const fetchUserAssignments = async () => {
  try {
    const data = await authAPI.getUserAssignments();
    setAssignments(data);
  } catch (err) {
    console.error('Error fetching assignments:', err);
  }
};

const fetchUserProjects = async () => {
  try {
    const data = await authAPI.getUserProjects();
    setProjects(data);
  } catch (err) {
    console.error('Error fetching projects:', err);
  }
};
const fetchUserResources = async () => {
  try {
    const data = await authAPI.getUserResources();
    setResources(data);
  } catch (err) {
    console.error('Error fetching resources:', err);
  }
};

const fetchUserAssessments = async () => {
  try {
    const data = await authAPI.getUserAssessments();
    setAssessments(data);
  } catch (err) {
    console.error('Error fetching assessments:', err);
  }
};

const fetchUserTasks = async () => {
  try {
    const data = await authAPI.getUserTasks();
    setTasks(data);
  } catch (err) {
    console.error('Error fetching tasks:', err);
  }
};

const fetchHelpRequests = async () => {
  setHelpRequestsLoading(true);
  try {
    const data = await authAPI.getHelpRequests();
    setHelpRequests(data);
  } catch (err) {
    console.error('Error fetching help requests:', err);
  } finally {
    setHelpRequestsLoading(false);
  }
};

const handleSubmitHelpRequest = async (e) => {
  e.preventDefault();
  setSubmittingHelpRequest(true);
  setHelpRequestError('');
  try {
    await authAPI.createHelpRequest({ topic: newHelpRequest.title, area: newHelpRequest.category, description: newHelpRequest.description });
    setNewHelpRequest({ title: '', description: '', category: 'Technical' });
    await fetchHelpRequests(); // Refresh the list
  } catch (err) {
    console.error('Error submitting help request:', err);
    setHelpRequestError(err.message || 'Failed to submit help request. Please try again.');
  } finally {
    setSubmittingHelpRequest(false);
  }
};

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loginResult = await authAPI.login(loginData.username, loginData.password);
      tokenManager.setToken(loginResult.token);
      const userDataFromResponse = loginResult.user || loginResult;
      const transformedUser = transformUserData(userDataFromResponse);
      tokenManager.setStoredUser(transformedUser);
      setUserData(transformedUser);
      setIsAuthenticated(true);
    fetchUserData();
fetchUserResources();
fetchUserTasks();
fetchUserModules();
fetchUserAssignments();
fetchUserProjects();
fetchUserAssessments();
await fetchAssignedMentor();
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    tokenManager.removeToken();
    tokenManager.removeStoredUser();
    setUserData(null);
    setIsAuthenticated(false);
    setResources([]);
    setLoginData({ username: '', password: '' });
    setError('');
    setAssignedMentor('To be assigned');
    navigate('/signin');
  };

  const handleLoginInputChange = (field, value) => {
    setLoginData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  // Component styles - Enhanced for students
  const styles = {
    loginContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    },
    loginContainerBefore: {
      content: '""',
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
      animation: 'float 6s ease-in-out infinite'
    },
    loginCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      padding: '40px',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
      width: '100%',
      maxWidth: '420px',
      backdropFilter: 'blur(20px)',
      position: 'relative',
      zIndex: '1',
      animation: 'slideUp 0.6s ease-out'
    },
    loginTitle: {
      fontSize: '32px',
      fontWeight: '800',
      color: '#1a202c',
      marginBottom: '12px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      letterSpacing: '-0.02em'
    },
    loginSubtitle: {
      fontSize: '18px',
      color: '#4a5568',
      marginBottom: '32px',
      textAlign: 'center',
      fontWeight: '500',
      lineHeight: '1.4'
    },
    loginForm: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    formGroup: {
      marginBottom: '0'
    },
    loginInput: {
      width: '100%',
      padding: '18px 24px',
      border: '2px solid #e2e8f0',
      borderRadius: '16px',
      fontSize: '16px',
      boxSizing: 'border-box',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      fontFamily: 'inherit',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.08)',
      outline: 'none'
    },
    loginInputFocus: {
      borderColor: '#667eea',
      boxShadow: '0 0 0 6px rgba(102, 126, 234, 0.15), 0 8px 16px rgba(0, 0, 0, 0.12)',
      transform: 'translateY(-2px)'
    },
    loginButton: {
      width: '100%',
      padding: '18px 24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '16px',
      fontSize: '18px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      fontFamily: 'inherit',
      boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
      position: 'relative',
      overflow: 'hidden'
    },
    loginButtonBefore: {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
      transition: 'left 0.5s'
    },
    loginButtonHover: {
      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
      transform: 'translateY(-3px)',
      boxShadow: '0 12px 28px rgba(102, 126, 234, 0.5)'
    },
    loginButtonDisabled: {
      backgroundColor: '#a0aec0',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    },
    container: {
      display: 'flex',
      height: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: "'Poppins', 'Inter', system-ui, sans-serif"
    },
    sidebar: {
      width: '380px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      padding: '40px 32px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      transition: 'left 0.3s ease-in-out',
      left: '0',
      overflowY: 'auto'
    },
    sidebarMobile: {
      position: 'fixed',
      top: '0',
      left: '-340px',
      height: '100vh',
      zIndex: '1000',
      boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)'
    },
    sidebarMobileOpen: {
      left: '0'
    },
    sidebarBefore: {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      height: '4px',
      background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 4s ease infinite'
    },
    welcomeSection: {
      marginBottom: '40px',
      paddingBottom: '32px',
      borderBottom: '2px solid #f1f5f9'
    },
    avatar: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '24px',
      fontWeight: '800',
      marginBottom: '24px',
      boxShadow: '0 12px 24px rgba(102, 126, 234, 0.4)',
      animation: 'pulse 2s ease-in-out infinite'
    },
    welcomeText: {
      fontSize: '22px',
      fontWeight: '800',
      color: '#1a202c',
      marginBottom: '12px',
      lineHeight: '1.3',
      letterSpacing: '-0.01em'
    },
    userInfo: {
      fontSize: '16px',
      color: '#4a5568',
      marginBottom: '8px',
      lineHeight: '1.4',
      fontWeight: '600'
    },
    userDetails: {
      fontSize: '14px',
      color: '#718096',
      marginBottom: '6px',
      lineHeight: '1.4',
      fontWeight: '500'
    },
    navTabs: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginTop: '32px',
      flex: '1'
    },
    navTab: {
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      padding: '18px 24px',
      borderRadius: '16px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      fontSize: '16px',
      fontWeight: '600',
      color: '#4a5568',
      fontFamily: 'inherit',
      textAlign: 'left',
      position: 'relative',
      overflow: 'hidden'
    },
    navTabBefore: {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.1), transparent)',
      transition: 'left 0.5s'
    },
    navTabHover: {
      background: '#f8fafc',
      color: '#1a202c',
      transform: 'translateX(6px) scale(1.02)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
    },
    navTabActive: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      fontWeight: '700',
      boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
      transform: 'translateX(12px) scale(1.05)',
      animation: 'bounceIn 0.3s ease-out'
    },
    navTabIcon: {
      fontSize: '20px',
      width: '28px',
      textAlign: 'center'
    },
    logoutButton: {
      padding: '18px 24px',
      backgroundColor: '#e53e3e',
      color: '#ffffff',
      border: 'none',
      borderRadius: '16px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '700',
      marginTop: 'auto',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      fontFamily: 'inherit',
      boxShadow: '0 8px 20px rgba(229, 62, 62, 0.4)',
      position: 'relative',
      overflow: 'hidden'
    },
    logoutButtonHover: {
      backgroundColor: '#c53030',
      transform: 'translateY(-3px)',
      boxShadow: '0 12px 28px rgba(229, 62, 62, 0.5)'
    },
    mainContent: {
      flex: '1',
      padding: '48px',
      overflowY: 'auto',
      backgroundColor: '#f8fafc',
      position: 'relative'
    },
    mainContentBefore: {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.03) 0%, transparent 50%)',
      pointerEvents: 'none'
    },
    contentHeader: {
      fontSize: '36px',
      fontWeight: '900',
      color: '#1a202c',
      marginBottom: '16px',
      lineHeight: '1.2',
      letterSpacing: '-0.03em',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: 'fadeInUp 0.8s ease-out'
    },
    subtitle: {
      fontSize: '20px',
      color: '#4a5568',
      marginBottom: '40px',
      lineHeight: '1.5',
      fontWeight: '500',
      animation: 'fadeInUp 0.8s ease-out 0.2s both'
    },
    userInfoCard: {
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      padding: '40px',
      marginBottom: '40px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      animation: 'fadeInUp 0.8s ease-out 0.4s both'
    },
    userInfoCardBefore: {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      height: '4px',
      background: 'linear-gradient(90deg, #667eea, #764ba2)',
      backgroundSize: '200% 200%',
      animation: 'gradientShift 3s ease infinite'
    },
    userInfoCardHover: {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
      transform: 'translateY(-8px) scale(1.02)'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '32px'
    },
    infoItem: {
      marginBottom: '0',
      padding: '24px',
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    },
    infoItemHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#ffffff'
    },
    infoLabel: {
      fontSize: '14px',
      color: '#718096',
      fontWeight: '800',
      marginBottom: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      position: 'relative',
      zIndex: '1'
    },
    infoValue: {
      fontSize: '20px',
      color: '#1a202c',
      fontWeight: '700',
      lineHeight: '1.4',
      position: 'relative',
      zIndex: '1'
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '400px',
      fontSize: '20px',
      color: '#4a5568',
      flexDirection: 'column',
      gap: '24px'
    },
    loadingSpinner: {
      width: '64px',
      height: '64px',
      border: '6px solid #e2e8f0',
      borderTop: '6px solid #667eea',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    error: {
      background: 'linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%)',
      color: '#c53030',
      padding: '24px',
      borderRadius: '16px',
      marginBottom: '32px',
      border: '1px solid #feb2b2',
      fontSize: '16px',
      lineHeight: '1.5',
      boxShadow: '0 8px 24px rgba(197, 48, 48, 0.15)',
      animation: 'shake 0.5s ease-in-out'
    },
    resourcesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '32px',
      marginTop: '32px'
    },
    resourceCard: {
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      border: '1px solid #e2e8f0',
      padding: '32px',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
      position: 'relative',
      overflow: 'hidden',
      animation: 'fadeInUp 0.8s ease-out both'
    },
    resourceCardBefore: {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      height: '4px',
      background: 'linear-gradient(90deg, #667eea, #764ba2)',
      backgroundSize: '200% 200%',
      animation: 'gradientShift 3s ease infinite'
    },
    resourceCardHover: {
      transform: 'translateY(-12px) scale(1.03)',
      boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
      borderColor: '#667eea'
    },
    resourceTitle: {
      fontSize: '22px',
      fontWeight: '800',
      color: '#1a202c',
      marginBottom: '16px',
      lineHeight: '1.3',
      position: 'relative',
      zIndex: '1'
    },
    resourceDescription: {
      fontSize: '16px',
      color: '#4a5568',
      marginBottom: '24px',
      lineHeight: '1.6',
      position: 'relative',
      zIndex: '1'
    },
    resourceMeta: {
      fontSize: '14px',
      color: '#718096',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontWeight: '600',
      position: 'relative',
      zIndex: '1'
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px 40px',
      color: '#4a5568',
      animation: 'fadeIn 1s ease-out'
    },
    quickActionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '24px',
      marginTop: '24px'
    },
    actionItem: {
      padding: '24px',
      backgroundColor: '#f8fafc',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer'
    },
    actionItemHover: {
      backgroundColor: '#edf2f7',
      transform: 'translateY(-6px) scale(1.02)',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)'
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#e2e8f0',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '12px'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #667eea, #764ba2)',
      borderRadius: '4px',
      transition: 'width 0.8s ease-out',
      animation: 'progressPulse 2s ease-in-out infinite'
    },
    mobileMenuButton: {
      position: 'fixed',
      top: '20px',
      left: '20px',
      zIndex: '1001',
      backgroundColor: '#667eea',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      padding: '10px',
      cursor: 'pointer',
      fontSize: '18px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      transition: 'all 0.3s ease'
    }
  };

  // Render functions for each tab
  const renderDashboard = () => (
    <div>
      <div>
        <h1 style={styles.contentHeader}>
          Welcome back, {userData?.name?.split(' ')[0] || 'Student'}!
        </h1>
        <p style={styles.subtitle}>
          Ready to continue your learning journey today?
        </p>
        <p style={{ ...styles.subtitle, fontSize: '16px', color: '#4a5568', marginTop: '8px' }}>
          {new Date().toLocaleString()}
        </p>
      </div>
      {userData && (
        <div
          style={styles.userInfoCard}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = styles.userInfoCardHover.boxShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = styles.userInfoCard.boxShadow;
          }}
        >
        
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Academic Program</div>
              <div style={styles.infoValue}>{userData.program}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Specialization Track</div>
              <div style={styles.infoValue}>{userData.track}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Cohort Name</div>
              <div style={styles.infoValue}>{userData.cohort}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Assigned Mentor</div>
              <div style={styles.infoValue}>{assignedMentor}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Start Date</div>
              <div style={styles.infoValue}>{userData.startDate}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Registration Month</div>
              <div style={styles.infoValue}>{userData.registrationMonth}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Current Semester</div>
              <div style={styles.infoValue}>{userData.semester}</div>
            </div>
          </div>
        </div>
      )}



      <div

        style={styles.userInfoCard}

        onMouseEnter={(e) => {

          e.currentTarget.style.boxShadow = styles.userInfoCardHover.boxShadow;

        }}

        onMouseLeave={(e) => {

          e.currentTarget.style.boxShadow = styles.userInfoCard.boxShadow;

        }}

      >

        <div style={styles.quickActionsGrid}>
          <div
            style={styles.actionItem}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = styles.actionItemHover.backgroundColor;
              e.currentTarget.style.transform = styles.actionItemHover.transform;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = styles.actionItem.backgroundColor;
              e.currentTarget.style.transform = 'none';
            }}
          >
              <div style={styles.infoLabel}>Important Notices</div>
              <div style={{ marginTop: 8 }}>
                {noticesLoading && <div style={{ color: '#666' }}>Loading...</div>}
                {!noticesLoading && notices && notices.length === 0 && <div style={{ color: '#666' }}>No announcements</div>}
                {!noticesLoading && notices && notices.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {notices.slice(0,3).map(n => (
                      <li key={n.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13, color: '#1a202c' }}>{n.title}</div>
                        <div style={{ fontSize: 11, color: '#718096' }}>{new Date(n.postedAt).toLocaleDateString()}</div>
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => { fetchNotices(); setActiveTab('notices-pane'); }}>View All</button>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );

  const languages = {
    'Web Development': `Web development involves creating and maintaining websites and web applications that are accessed through the internet. It plays a crucial role in the digital world, supporting everything from personal blogs to large-scale platforms like online stores, social media sites, and enterprise systems. At the core of web development are three essential technologies: HTML (HyperText Markup Language), CSS (Cascading Style Sheets), and JavaScript—each responsible for the structure, design, and interactivity of a website. Ready to create your first website? This course is the perfect introduction to becoming a confident web developer. Whether you're pursuing a career in tech or simply exploring a new passion, our beginner-friendly modules will walk you through the fundamentals of HTML, CSS, and JavaScript. By the end of this course, you’ll be equipped to build real websites from the ground up, gaining hands-on coding experience—all at your own pace.`,
    'Java Programming': `Java programming is a foundational skill in computer science and software development. It's a powerful, object-oriented language used in everything from mobile apps and enterprise systems to web services and embedded devices. Known for its portability and scalability, Java is widely used across industries, making it an essential skill for aspiring developers. Ready to become a Java developer? This course is the ideal starting point for beginners who want to master Java fundamentals and gain hands-on experience writing real programs. Whether you're pursuing a tech career or exploring programming for the first time, our beginner-friendly modules will guide you step-by-step through the core concepts of Java. By the end of this course, you’ll be confident in writing, compiling, and debugging Java code—building a solid foundation for more advanced development work.`,
    'C# Programming': `C# (pronounced "C-Sharp") is a modern, object-oriented programming language developed by Microsoft. It’s widely used for building desktop applications, web services, mobile apps, games (using Unity), and enterprise solutions with .NET. Known for its simplicity, power, and integration with the Microsoft ecosystem, C# is an excellent choice for both beginners and experienced developers. Ready to dive into coding with C#? This course is designed to introduce you to the essential concepts and practices of C# programming. Whether you’re pursuing a tech career or looking to build your own software, our beginner-friendly modules will help you master the fundamentals of C# in a structured, hands-on way. By the end of this course, you'll be able to build robust and interactive applications using C#, gaining practical coding experience at your own pace.`,
    'Robotics': 'Coming Soon',
    'Python Programming': `Python is a powerful, easy-to-learn programming language used for everything from web development and data analysis to artificial intelligence and automation. Its simple syntax and vast ecosystem make it one of the most popular languages for beginners and professionals alike. Ready to start coding? This course is designed for absolute beginners who want to build a strong foundation in Python. Whether you're aiming to become a developer, data scientist, or just want to automate everyday tasks, our hands-on modules will guide you step-by-step through the essentials. By the end of this course, you’ll be able to write your own Python programs, solve real-world problems, and feel confident taking on more advanced topics like machine learning or web development.`
  };

  const getProgramDescription = (program) => {
    const descriptions = {
      'Mentorship Program': `The mentorship component of OnTrack Connect is designed to guide students and graduates through their journey of learning to code at different levels. Participants is paired with a mentor in the space who offers support and insights. Mentoring sessions include career planning, soft skills development, and feedback on personal goals. Mentors help learners navigate challenges, boost confidence, and refine their aspirations. The program fosters a trusted relationship where mentees can ask questions freely and learn from real-world experiences. It goes beyond advice, emphasizing accountability, encouragement, and meaningful growth. Mentors act as role models and sounding boards, equipping students with wisdom they won't find in classrooms. The mentorship track also includes masterclasses, networking opportunities, and peer-to-peer sessions. We tailor each mentorship journey to suit the learner's goals, building a startup, or improving communication skills. Mentees benefit from personalized guidance in CV building, interview preparation, and industry alignment. The goal is to develop not just skills, but clarity and confidence. Mentorship runs across all cohorts—beginner, intermediate, and advanced—and is integrated into project reviews. Participants walk away with lifelong connections and a sharper sense of direction. At OnTrack Connect, it's movement. It's the compass that makes all the learning make sense.`,
      'Skills Development Program': `The Skill Development Program equips learners with job-ready tech and entrepreneurial skills through hands-on projects and a startup-style environment. Leave with tangible proof of your skills and the confidence to apply them in the real world. The Skill Development program at OnTrack Connect equips university students with practical, job-ready tech and entrepreneurial skills. It's a structured, hands-on learning journey designed to help learners build real solutions—not just consume theory. Participants choose a focus area like Web Development, Java, C#, Python, or Robotics, and follow a guided curriculum with weekly milestones. The program emphasizes "learning by doing", where mentees code, create, build, and present projects. Each skill path is divided into cohorts—beginner, intermediate, and advanced—to meet students at their level. Lessons include both technical and soft skill components to prepare learners for real-world work. Instead of a traditional classroom, students learn in an environment that mimics a startup or dev team. Weekly challenges, peer reviews, and feedback loops ensure consistent progress. Industry mentors also offer short talks or demos to link theory with practice. The program ends with a capstone project and portfolio review, giving learners something tangible to show future employers. Unlike internships, skill development doesn't require external placement—it's about building your own capacity. Unlike mentorship, it's about mastering tools and techniques. It's intense, practical, and outcome-driven. OnTrack's Skill Development isn't about ticking boxes—it's about transforming learners into capable builders.`,
      'Internship Program': `The OnTrack Connect Internship Program is a structured initiative aimed at providing students with real-world industry exposure in short-term, supervised roles. Each internship is designed to align with a student's specific tech skills and career goals, enabling them to apply what they've learned in practical environments. Participants are matched with companies, mentors, or project leads who provide guidance and evaluate progress throughout the experience. The program goes beyond just technical work—it focuses on building well-rounded, work-ready individuals. Interns engage in weekly progress check-ins, collaborative tasks, and feedback sessions to encourage growth and reflection. They also receive training in communication, time management, and workplace etiquette through soft skills workshops. As part of the journey, students begin building a verified portfolio, gain valuable industry references, and experience the realities of teamwork in professional settings. This not only builds confidence and credibility but also prepares them for long-term success. The internship serves as a vital bridge between education and employment—turning learning into lasting opportunity.`,
      'Graduate Program': `A personalised, project-driven accelerator for graduates ready to launch their tech careers. Work on two real-world projects with senior mentor guidance, sharpening your technical mastery and professional presence. OnTrack Connect is excited to announce its Software Graduate Program, launching in 2026, designed to equip aspiring developers with cutting-edge skills in Python, Java, and React. This comprehensive program offers hands-on training, enabling participants to work alongside industry professionals while building a robust portfolio. Focused on both technical and leadership development, the initiative prepares graduates for meaningful achievements in the tech sector. Supported by IT Varsity, the program emphasizes a bright future for its participants, combining practical experience with career growth opportunities. Participants will benefit from a structured curriculum that covers in-demand technologies, fostering expertise in software development. The program also prioritizes leadership skills, ensuring graduates are well-rounded and ready for real-world challenges. By joining OnTrack Connect, students gain access to a network of professionals and resources that enhance their employability, creating a professional portfolio, deep technical experience, and the confidence to stand out in competitive job markets.`
    };
    const descriptionKey = program === 'Skill Development Program' ? 'Skills Development Program' : program;
    return descriptions[descriptionKey] || 'Program description not available.';
  };

  const getTrackDescription = (track) => {
    const descriptions = {
      'Web Development': `Web development involves creating and maintaining websites and web applications that are accessed through the internet. It plays a crucial role in the digital world, supporting everything from personal blogs to large-scale platforms like online stores, social media sites, and enterprise systems. At the core of web development are three essential technologies: HTML (HyperText Markup Language), CSS (Cascading Style Sheets), and JavaScript—each responsible for the structure, design, and interactivity of a website. Ready to create your first website? This course is the perfect introduction to becoming a confident web developer. Whether you're pursuing a career in tech or simply exploring a new passion, our beginner-friendly modules will walk you through the fundamentals of HTML, CSS, and JavaScript. By the end of this course, you'll be equipped to build real websites from the ground up, gaining hands-on coding experience—all at your own pace.`,
      'Java Programming': `Java programming is a foundational skill in computer science and software development. It's a powerful, object-oriented language used in everything from mobile apps and enterprise systems to web services and embedded devices. Known for its portability and scalability, Java is widely used across industries, making it an essential skill for aspiring developers. Ready to become a Java developer? This course is the ideal starting point for beginners who want to master Java fundamentals and gain hands-on experience writing real programs. Whether you're pursuing a tech career or exploring programming for the first time, our beginner-friendly modules will guide you step-by-step through the core concepts of Java. By the end of this course, you'll be confident in writing, compiling, and debugging Java code—building a solid foundation for more advanced development work.`,
      'C# Programming': `C# (pronounced "C-Sharp") is a modern, object-oriented programming language developed by Microsoft. It's widely used for building desktop applications, web services, mobile apps, games (using Unity), and enterprise solutions with .NET. Known for its simplicity, power, and integration with the Microsoft ecosystem, C# is an excellent choice for both beginners and experienced developers. Ready to dive into coding with C#? This course is designed to introduce you to the essential concepts and practices of C# programming. Whether you're pursuing a tech career or looking to build your own software, our beginner-friendly modules will help you master the fundamentals of C# in a structured, hands-on way. By the end of this course, you'll be able to build robust and interactive applications using C#, gaining practical coding experience at your own pace.`,
      'Robotics': 'Coming Soon',
      'Python Programming': `Python is a powerful, easy-to-learn programming language used for everything from web development and data analysis to artificial intelligence and automation. Its simple syntax and vast ecosystem make it one of the most popular languages for beginners and professionals alike. Ready to start coding? This course is designed for absolute beginners who want to build a strong foundation in Python. Whether you're aiming to become a developer, data scientist, or just want to automate everyday tasks, our hands-on modules will guide you step-by-step through the essentials. By the end of this course, you'll be able to write your own Python programs, solve real-world problems, and feel confident taking on more advanced topics like machine learning or web development.`
    };
    return descriptions[track] || 'Track description not available.';
  };

  const renderCourses = () => (
    <div>
      <h1 style={styles.contentHeader}>Academic Courses</h1>
      <p style={styles.subtitle}>
        Explore your course curriculum for {userData?.track} specialization
      </p>
      <div style={styles.userInfoCard}>
        <h3 style={{ marginBottom: '20px', color: '#1a202c', fontSize: '20px' }}>
          About Your Program: {userData?.program} - {userData?.track}
        </h3>
        <div style={{ marginBottom: '20px', lineHeight: '1.6', color: '#4a5568', fontSize: '16px' }}>
          <p style={{ marginBottom: '15px' }}><strong>Program:</strong> {getProgramDescription(userData?.program)}</p>
          <p><strong>About the Track:</strong> {getTrackDescription(userData?.track)}</p>
        </div>
        {userData?.program === 'Graduate Program' && (
          <div style={{ marginTop: '30px' }}>
            <h4 style={{ marginBottom: '20px', color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>
              Available Languages:
            </h4>
            {Object.entries(languages).map(([language, description]) => (
              <div key={language} style={{ marginBottom: '25px' }}>
                <h5 style={{ marginBottom: '10px', color: '#2b6cb0', fontSize: '16px', fontWeight: '600' }}>
                  {language}
                </h5>
                <div style={{ lineHeight: '1.6', color: '#4a5568', fontSize: '14px' }}>
                  {description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderNotices = () => (
    <div style={{ padding: 20 }}>
      <div style={{ marginTop: 12 }}>
        {noticesLoading && <div>Loading...</div>}
        {!noticesLoading && notices.length === 0 && <div>No notices available.</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {notices.map(n => (
            <li key={n.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
              <div style={{ marginBottom: 6 }}>
                <h4 style={{ margin: 0, fontSize: 15 }}>{n.title}</h4>
                <div style={{ fontSize: 12, color: '#718096' }}>Date: {n.postedAt ? new Date(n.postedAt).toLocaleDateString() : ''}</div>
              </div>
              <div style={{ color: '#4a5568', fontSize: 13, marginBottom: 8 }}>{n.message ? (n.message.length > 120 ? n.message.slice(0,117) + '...' : n.message) : ''}</div>
              <div>
                <button onClick={() => setSelectedNotice(n)}>View</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {selectedNotice && (
        <div style={{ marginTop: 20, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
          <h3>{selectedNotice.title}</h3>
          <div style={{ color: '#666', fontSize: 12 }}>{new Date(selectedNotice.postedAt).toLocaleString()}</div>
          <div style={{ marginTop: 10 }}>{selectedNotice.message}</div>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setSelectedNotice(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );

const renderModules = () => {
  const moduleList = modules;

  return (
    <div>
      <h1 style={styles.contentHeader}>Modules</h1>
      <p style={styles.subtitle}>Your assigned modules and learning materials for {userData?.track}</p>

      {moduleList && moduleList.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginTop: '20px', height: '70vh' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', overflowY: 'scroll' }}>
            <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', margin: 0 }}>Module List ({moduleList.length})</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {moduleList.map((module, index) => (
                <div key={index} onClick={() => setSelectedModule(module)} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: selectedModule?.assessmentname === module.assessmentname ? '#ebf8ff' : '#ffffff', cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: selectedModule?.assessmentname === module.assessmentname ? '4px solid #4299e1' : '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: selectedModule?.assessmentname === module.assessmentname ? '#2b6cb0' : '#1a202c', marginBottom: '6px' }}>{module.assessmentname}</div>
                  <div style={{ fontSize: '14px', color: '#718096', marginBottom: '6px' }}>Added: {module.createdAt ? new Date(module.createdAt).toLocaleDateString() : 'N/A'}</div>
                  <div style={{ fontSize: '14px', color: '#4a5568' }}>Due: {module.datedue ? new Date(module.datedue).toLocaleDateString() : 'TBD'}</div>
                  {module.documentLink && (
                    <div style={{ marginTop: '8px' }}>
                      <button onClick={(e) => { e.stopPropagation(); openDocumentModal(module.documentLink); }} style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#4299e1', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>View Document</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {selectedModule ? (
              <>
                <div style={{ marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', marginBottom: '10px' }}>{selectedModule.assessmentname}</h2>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#718096', marginBottom: '20px' }}>
                    <div><strong>Added:</strong> {selectedModule.createdAt ? new Date(selectedModule.createdAt).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Due:</strong> {selectedModule.datedue ? new Date(selectedModule.datedue).toLocaleDateString() : 'TBD'}</div>
                  </div>
                  {selectedModule.documentLink && (
                    <div style={{ marginBottom: '20px' }}>
                      <button onClick={() => openDocumentModal(selectedModule.documentLink)} style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#4299e1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>View Document</button>
                    </div>
                  )}
                </div>

                <div style={{ flex: '1', marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', marginBottom: '15px' }}>Module Details</h3>
                  {selectedModule.description ? (
                    <div style={{ lineHeight: '1.6', color: '#4a5568', fontSize: '16px' }}>{selectedModule.description}</div>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
                      <p>No detailed description available for this module.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: '#a0aec0' }}>
                <div>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>📖</div>
                  <h3 style={{ color: '#1a202c', marginBottom: '10px' }}>Select a Module</h3>
                  <p>Choose a module from the list to view its details and materials</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.userInfoCard}>
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Modules Available</h3>
            <p>Your modules for {userData?.program} - {userData?.track} will be displayed here when available.</p>
          </div>
        </div>
      )}
    </div>
  );
};
const renderResources = () => {
  const resourceList = resources;

  return (
    <div>
      <h1 style={styles.contentHeader}>Learning Resources</h1>
      <p style={styles.subtitle}>Educational materials for {userData?.program} - {userData?.track}</p>

      {resourceList && resourceList.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginTop: '20px', height: '70vh' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', overflowY: 'scroll' }}>
            <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', margin: 0 }}>Resources ({resourceList.length})</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {resourceList.map((resource, index) => (
                <div key={resource._id || index} onClick={() => setSelectedResource(resource)} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: selectedResource?.assessmentname === resource.assessmentname ? '#ebf8ff' : '#ffffff', cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: selectedResource?.assessmentname === resource.assessmentname ? '4px solid #4299e1' : '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: selectedResource?.assessmentname === resource.assessmentname ? '#2b6cb0' : '#1a202c', marginBottom: '6px' }}>{resource.assessmentname}</div>
                  <div style={{ fontSize: '14px', color: '#718096', marginBottom: '6px' }}>Added: {resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : 'N/A'}</div>
                  <div style={{ fontSize: '14px', color: '#4a5568' }}>{resource.program} • {resource.track}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {selectedResource ? (
              <>
                <div style={{ marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', marginBottom: '10px' }}>{selectedResource.assessmentname}</h2>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#718096', marginBottom: '20px' }}>
                    <div><strong>Added:</strong> {selectedResource.createdAt ? new Date(selectedResource.createdAt).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Program:</strong> {selectedResource.program}</div>
                    <div><strong>Track:</strong> {selectedResource.track}</div>
                  </div>
                  {selectedResource.documentLink && (
                    <div style={{ marginBottom: '20px' }}>
                      <button onClick={() => openDocumentModal(selectedResource.documentLink)} style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: '#4299e1', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>View Document</button>
                    </div>
                  )}
                </div>

                <div style={{ flex: '1', marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a202c', marginBottom: '15px' }}>Resource Details</h3>
                  {selectedResource.description ? (
                    <div style={{ lineHeight: '1.6', color: '#4a5568', fontSize: '16px' }}>{selectedResource.description}</div>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                      <p>No detailed description available for this resource.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: '#a0aec0' }}>
                <div>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
                  <h3 style={{ color: '#1a202c', marginBottom: '10px' }}>Select a Resource</h3>
                  <p>Choose a resource from the list to view its details and materials</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.userInfoCard}>
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Resources Available</h3>
            <p>Learning resources will be published here as they become available.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const renderAssignments = () => {
const assignmentAssessments = assignments;
  
  return (
    <div>
      <h1 style={styles.contentHeader}>Academic Assignments</h1>
      <p style={styles.subtitle}>
        Track and submit your coursework for {userData?.program}
      </p>
      
      {assignmentAssessments && assignmentAssessments.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '24px',
          marginTop: '20px',
          height: '70vh'
        }}>
          {/* Left Panel - Assignment List */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            overflowY: 'scroll'
          }}>
            <div style={{
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a202c',
                margin: 0
              }}>
                Assignment List ({assignmentAssessments.length})
              </h3>
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {assignmentAssessments.map((assignment, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedAssignment(assignment)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: selectedAssignment?.assessmentname === assignment.assessmentname 
                      ? '#ebf8ff' 
                      : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderLeft: selectedAssignment?.assessmentname === assignment.assessmentname 
                      ? '4px solid #4299e1' 
                      : '1px solid #e2e8f0'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAssignment?.assessmentname !== assignment.assessmentname) {
                      e.currentTarget.style.backgroundColor = '#f7fafc';
                      e.currentTarget.style.borderColor = '#cbd5e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAssignment?.assessmentname !== assignment.assessmentname) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: selectedAssignment?.assessmentname === assignment.assessmentname
                      ? '#2b6cb0'
                      : '#1a202c',
                    marginBottom: '6px'
                  }}>
                    {assignment.assessmentname}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#718096',
                    marginBottom: '6px'
                  }}>
                    Added: {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#f56565',
                    fontWeight: '500'
                  }}>
                    Due: {assignment.datedue ? new Date(assignment.datedue).toLocaleDateString() : 'TBD'}
                  </div>
                  {assignment.documentLink && (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDocumentModal(assignment.documentLink);
                        }}
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: '#4299e1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#3182ce';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#4299e1';
                          e.target.style.transform = 'none';
                        }}
                      >
                        View Document
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Panel - Assignment Content */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {selectedAssignment ? (
              <>
                <div style={{
                  marginBottom: '30px'
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1a202c',
                    marginBottom: '10px'
                  }}>
                    {selectedAssignment.assessmentname}
                  </h2>
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    fontSize: '14px',
                    color: '#718096',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <strong>Added:</strong> {selectedAssignment.createdAt ? new Date(selectedAssignment.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                      <strong>Due:</strong> {selectedAssignment.datedue ? new Date(selectedAssignment.datedue).toLocaleDateString() : 'TBD'}
                    </div>
                  </div>
                  {selectedAssignment.documentLink && (
                    <div style={{ marginBottom: '20px' }}>
                      <button
                        onClick={() => openDocumentModal(selectedAssignment.documentLink)}
                        style={{
                          display: 'inline-block',
                          padding: '12px 24px',
                          backgroundColor: '#4299e1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#3182ce';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#4299e1';
                          e.target.style.transform = 'none';
                        }}
                      >
                        View Document
                      </button>
                    </div>
                  )}
                </div>
                
                <div style={{
                  flex: '1',
                  marginBottom: '30px'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1a202c',
                    marginBottom: '15px'
                  }}>
                    Assignment Details
                  </h3>
                  {selectedAssignment.description ? (
                    <div style={{
                      lineHeight: '1.6',
                      color: '#4a5568',
                      fontSize: '16px'
                    }}>
                      {selectedAssignment.description}
                    </div>
                  ) : (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      backgroundColor: '#f7fafc',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                      <p>No detailed description available for this assignment.</p>
                    </div>
                  )}
                </div>
                
                {selectedAssignment.documentLink && (
                  <div>
                    <button
                      onClick={() => openDocumentModal(selectedAssignment.documentLink)}
                      style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        backgroundColor: '#4299e1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#3182ce';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#4299e1';
                        e.target.style.transform = 'none';
                      }}
                    >
                      View Document
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                color: '#a0aec0'
              }}>
                <div>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
                  <h3 style={{ color: '#1a202c', marginBottom: '10px' }}>Select an Assignment</h3>
                  <p>Choose an assignment from the list to view its details and requirements</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.userInfoCard}>
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Assignments Available</h3>
            <p>Your assignments will be displayed here when available.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const renderAssessments = () => {
  const assessmentAssessments = assessments;

  return (
    <div>
      <h1 style={styles.contentHeader}>Academic Assessments</h1>
      <p style={styles.subtitle}>
        Track and submit your assessments for {userData?.program}
      </p>

      {assessmentAssessments && assessmentAssessments.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '24px',
          marginTop: '20px',
          height: '70vh'
        }}>
          {/* Left Panel - Assessment List */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            overflowY: 'scroll'
          }}>
            <div style={{
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a202c',
                margin: 0
              }}>
                Assessment List ({assessmentAssessments.length})
              </h3>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {assessmentAssessments.map((assessment, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedAssessment(assessment)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: selectedAssessment?.assessmentname === assessment.assessmentname
                      ? '#ebf8ff'
                      : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderLeft: selectedAssessment?.assessmentname === assessment.assessmentname
                      ? '4px solid #4299e1'
                      : '1px solid #e2e8f0'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAssessment?.assessmentname !== assessment.assessmentname) {
                      e.currentTarget.style.backgroundColor = '#f7fafc';
                      e.currentTarget.style.borderColor = '#cbd5e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAssessment?.assessmentname !== assessment.assessmentname) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: selectedAssessment?.assessmentname === assessment.assessmentname
                      ? '#2b6cb0'
                      : '#1a202c',
                    marginBottom: '6px'
                  }}>
                    {assessment.assessmentname}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#718096',
                    marginBottom: '6px'
                  }}>
                    Added: {assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#f56565',
                    fontWeight: '500'
                  }}>
                    Due: {assessment.datedue ? new Date(assessment.datedue).toLocaleDateString() : 'TBD'}
                  </div>
                  {assessment.documentLink && (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDocumentModal(assessment.documentLink);
                        }}
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: '#4299e1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#3182ce';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#4299e1';
                          e.target.style.transform = 'none';
                        }}
                      >
                        View Document
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Assessment Content */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {selectedAssessment ? (
              <>
                <div style={{
                  marginBottom: '30px'
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1a202c',
                    marginBottom: '10px'
                  }}>
                    {selectedAssessment.assessmentname}
                  </h2>
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    fontSize: '14px',
                    color: '#718096',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <strong>Added:</strong> {selectedAssessment.createdAt ? new Date(selectedAssessment.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                      <strong>Due:</strong> {selectedAssessment.datedue ? new Date(selectedAssessment.datedue).toLocaleDateString() : 'TBD'}
                    </div>
                  </div>
                  {selectedAssessment.documentLink && (
                    <div style={{ marginBottom: '20px' }}>
                      <button
                        onClick={() => openDocumentModal(selectedAssessment.documentLink)}
                        style={{
                          display: 'inline-block',
                          padding: '12px 24px',
                          backgroundColor: '#4299e1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#3182ce';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#4299e1';
                          e.target.style.transform = 'none';
                        }}
                      >
                        View Document
                      </button>
                    </div>
                  )}
                </div>

                <div style={{
                  flex: '1',
                  marginBottom: '30px'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1a202c',
                    marginBottom: '15px'
                  }}>
                    Assessment Details
                  </h3>
                  {selectedAssessment.description ? (
                    <div style={{
                      lineHeight: '1.6',
                      color: '#4a5568',
                      fontSize: '16px'
                    }}>
                      {selectedAssessment.description}
                    </div>
                  ) : (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      backgroundColor: '#f7fafc',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
                      <p>No detailed description available for this assessment.</p>
                    </div>
                  )}
                </div>

                {selectedAssessment.documentLink && (
                  <div>
                    <button
                      onClick={() => openDocumentModal(selectedAssessment.documentLink)}
                      style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        backgroundColor: '#4299e1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#3182ce';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#4299e1';
                        e.target.style.transform = 'none';
                      }}
                    >
                      View Document
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                color: '#a0aec0'
              }}>
                <div>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
                  <h3 style={{ color: '#1a202c', marginBottom: '10px' }}>Select an Assessment</h3>
                  <p>Choose an assessment from the list to view its details and requirements</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.userInfoCard}>
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Assessments Available</h3>
            <p>Your assessments will be displayed here when available.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const renderTasks = () => {
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.datedue) return 1;
    if (!b.datedue) return -1;
    return new Date(a.datedue) - new Date(b.datedue);
  });
  
  return (
    <div>
      <h1 style={styles.contentHeader}>Tasks</h1>
      <p style={styles.subtitle}>
        Your assigned tasks and activities for {userData?.program} - {userData?.track}
      </p>
      
      {sortedTasks && sortedTasks.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '24px',
          marginTop: '20px',
          height: '70vh'
        }}>
          {/* Left Panel - Task List */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            overflowY: 'scroll'
          }}>
            <div style={{
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a202c',
                margin: 0
              }}>
                Task List ({sortedTasks.length})
              </h3>
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {sortedTasks.map((task, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedTask(task)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: selectedTask?.assessmentname === task.assessmentname 
                      ? '#ebf8ff' 
                      : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderLeft: selectedTask?.assessmentname === task.assessmentname 
                      ? '4px solid #4299e1' 
                      : '1px solid #e2e8f0'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTask?.assessmentname !== task.assessmentname) {
                      e.currentTarget.style.backgroundColor = '#f7fafc';
                      e.currentTarget.style.borderColor = '#cbd5e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTask?.assessmentname !== task.assessmentname) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: selectedTask?.assessmentname === task.assessmentname
                      ? '#2b6cb0'
                      : '#1a202c',
                    marginBottom: '6px'
                  }}>
                    {task.assessmentname}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#718096',
                    marginBottom: '6px'
                  }}>
                    Added: {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#f56565',
                    fontWeight: '500'
                  }}>
                    Due: {task.datedue ? new Date(task.datedue).toLocaleDateString() : 'TBD'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Panel - Task Content */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {selectedTask ? (
              <>
                <div style={{
                  marginBottom: '30px'
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1a202c',
                    marginBottom: '10px'
                  }}>
                    {selectedTask.assessmentname}
                  </h2>
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    fontSize: '14px',
                    color: '#718096',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <strong>Added:</strong> {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                      <strong>Due:</strong> {selectedTask.datedue ? new Date(selectedTask.datedue).toLocaleDateString() : 'TBD'}
                    </div>
                  </div>
                </div>
                
                <div style={{
                  flex: '1',
                  marginBottom: '30px'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1a202c',
                    marginBottom: '15px'
                  }}>
                    Task Details
                  </h3>
                  {selectedTask.description ? (
                    <div style={{
                      lineHeight: '1.6',
                      color: '#4a5568',
                      fontSize: '16px'
                    }}>
                      {selectedTask.description}
                    </div>
                  ) : (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      backgroundColor: '#f7fafc',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                      <p>No detailed description available for this task.</p>
                    </div>
                  )}
                </div>
                
                {selectedTask.documentLink && (
                  <div>
                    <button
                      onClick={() => openDocumentModal(selectedTask.documentLink)}
                      style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        backgroundColor: '#4299e1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#3182ce';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#4299e1';
                        e.target.style.transform = 'none';
                      }}
                    >
                      View Document
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                color: '#a0aec0'
              }}>
                <div>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
                  <h3 style={{ color: '#1a202c', marginBottom: '10px' }}>Select a Task</h3>
                  <p>Choose a task from the list to view its details and requirements</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.userInfoCard}>
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Tasks Available</h3>
            <p>No tasks have been assigned for your program and track yet. Check back later!</p>
          </div>
        </div>
      )}
    </div>
  );
};

const renderProjects = () => {
  const projectAssessments = projects;
  
  return (
    <div>
      <h1 style={styles.contentHeader}>Projects</h1>
      <p style={styles.subtitle}>
        Your assigned projects and collaborative work
      </p>
      
      {projectAssessments && projectAssessments.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '24px',
          marginTop: '20px',
          height: '70vh'
        }}>
          {/* Left Panel - Project List */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            overflowY: 'scroll'
          }}>
            <div style={{
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a202c',
                margin: 0
              }}>
                Project List ({projectAssessments.length})
              </h3>
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {projectAssessments.map((project, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedProject(project)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: selectedProject?.assessmentname === project.assessmentname 
                      ? '#ebf8ff' 
                      : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderLeft: selectedProject?.assessmentname === project.assessmentname 
                      ? '4px solid #4299e1' 
                      : '1px solid #e2e8f0'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProject?.assessmentname !== project.assessmentname) {
                      e.currentTarget.style.backgroundColor = '#f7fafc';
                      e.currentTarget.style.borderColor = '#cbd5e0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProject?.assessmentname !== project.assessmentname) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: selectedProject?.assessmentname === project.assessmentname
                      ? '#2b6cb0'
                      : '#1a202c',
                    marginBottom: '6px'
                  }}>
                    {project.assessmentname}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#718096',
                    marginBottom: '6px'
                  }}>
                    Added: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#f56565',
                    fontWeight: '500'
                  }}>
                    Due: {project.datedue ? new Date(project.datedue).toLocaleDateString() : 'TBD'}
                  </div>
                  {project.documentLink && (
                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDocumentModal(project.documentLink);
                        }}
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: '#4299e1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#3182ce';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#4299e1';
                          e.target.style.transform = 'none';
                        }}
                      >
                        View Document
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Panel - Project Content */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '30px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {selectedProject ? (
              <>
                <div style={{
                  marginBottom: '30px'
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1a202c',
                    marginBottom: '10px'
                  }}>
                    {selectedProject.assessmentname}
                  </h2>
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    fontSize: '14px',
                    color: '#718096',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <strong>Added:</strong> {selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                      <strong>Due:</strong> {selectedProject.datedue ? new Date(selectedProject.datedue).toLocaleDateString() : 'TBD'}
                    </div>
                  </div>
                  {selectedProject.documentLink && (
                    <div style={{ marginBottom: '20px' }}>
                      <button
                        onClick={() => openDocumentModal(selectedProject.documentLink)}
                        style={{
                          display: 'inline-block',
                          padding: '12px 24px',
                          backgroundColor: '#4299e1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#3182ce';
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#4299e1';
                          e.target.style.transform = 'none';
                        }}
                      >
                        View Document
                      </button>
                    </div>
                  )}
                </div>

                <div style={{
                  flex: '1',
                  marginBottom: '30px'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1a202c',
                    marginBottom: '15px'
                  }}>
                    Project Details
                  </h3>
                  {selectedProject.description ? (
                    <div style={{
                      lineHeight: '1.6',
                      color: '#4a5568',
                      fontSize: '16px'
                    }}>
                      {selectedProject.description}
                    </div>
                  ) : (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      backgroundColor: '#f7fafc',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
                      <p>No detailed description available for this project.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                color: '#a0aec0'
              }}>
                <div>
                  <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
                  <h3 style={{ color: '#1a202c', marginBottom: '10px' }}>Select a Project</h3>
                  <p>Choose a project from the list to view its details and requirements</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.userInfoCard}>
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Projects Available</h3>
            <p>Your projects will be displayed here when available.</p>
          </div>
        </div>
      )}
    </div>
  );
};

  const renderProfile = () => (
    <div>
      <h1 style={styles.contentHeader}>Student Profile</h1>
      <p style={styles.subtitle}>
        Manage your personal and academic information
      </p>
      {userData && (
        <div
          style={styles.userInfoCard}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = styles.userInfoCardHover.boxShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = styles.userInfoCard.boxShadow;
          }}
        >
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Full Name</div>
              <div style={styles.infoValue}>{userData.name}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Username</div>
              <div style={styles.infoValue}>{userData.username}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Contact Number</div>
              <div style={styles.infoValue}>{userData.cellnumber}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Academic Program</div>
              <div style={styles.infoValue}>{userData.program}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Specialization</div>
              <div style={styles.infoValue}>{userData.track}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Student Cohort</div>
              <div style={styles.infoValue}>{userData.cohort}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Enrollment Date</div>
              <div style={styles.infoValue}>{userData.startDate}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCommunity = () => (
    <div>
      <h1 style={styles.contentHeader}>My Community</h1>
      <p style={styles.subtitle}>
        Connect with peers, share insights, and collaborate on projects
      </p>
      <div style={styles.userInfoCard}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>Community Hub</h3>
          <p>Discussion forums, peer collaboration tools, and networking features are coming soon.</p>
        </div>
      </div>
    </div>
  );

  const renderHelpRequests = () => (
    <div>
      <h1 style={styles.contentHeader}>Help Requests</h1>
      <p style={styles.subtitle}>
        Submit and track your help requests for {userData?.program}
      </p>

      {/* Submit New Help Request */}
      <div style={styles.userInfoCard}>
        <h3 style={{ marginBottom: '20px', color: '#1a202c', fontSize: '20px' }}>
          Submit a New Help Request
        </h3>
        <form onSubmit={handleSubmitHelpRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {helpRequestError && <p role="alert">{helpRequestError}</p>}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#4a5568' }}>
              Title
            </label>
            <input
              type="text"
              value={newHelpRequest.title}
              onChange={(e) => setNewHelpRequest(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief title for your request"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#4a5568' }}>
              Category
            </label>
            <select
              value={newHelpRequest.category}
              onChange={(e) => setNewHelpRequest(prev => ({ ...prev, category: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit'
              }}
            >
              <option value="Technical">Technical</option>
              <option value="Academic">Academic</option>
              <option value="Administrative">Administrative</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#4a5568' }}>
              Description
            </label>
            <textarea
              value={newHelpRequest.description}
              onChange={(e) => setNewHelpRequest(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of your request"
              required
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={submittingHelpRequest}
            style={{
              padding: '12px 24px',
              backgroundColor: '#667eea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: submittingHelpRequest ? 'not-allowed' : 'pointer',
              opacity: submittingHelpRequest ? 0.6 : 1
            }}
          >
            {submittingHelpRequest ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>

      {/* Existing Help Requests */}
      <div style={styles.userInfoCard}>
        <h3 style={{ marginBottom: '20px', color: '#1a202c', fontSize: '20px' }}>
          Your Help Requests
        </h3>
        {helpRequestsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={styles.loadingSpinner}></div>
            <div style={{ marginTop: '16px', color: '#4a5568' }}>Loading help requests...</div>
          </div>
        ) : helpRequests && helpRequests.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {helpRequests.map((request) => (
              <div
                key={request.id || request._id}
                style={{
                  padding: '20px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, color: '#1a202c', fontSize: '18px' }}>{request.topic || request.title}</h4>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: request.status === 'Resolved' ? '#c6f6d5' : request.status === 'In Progress' ? '#fef5e7' : '#fed7d7',
                    color: request.status === 'Resolved' ? '#22543d' : request.status === 'In Progress' ? '#744210' : '#742a2a'
                  }}>
                    {request.status || 'Pending'}
                  </span>
                </div>
                <p style={{ margin: '8px 0', color: '#4a5568', fontSize: '14px' }}>
                  <strong>Category:</strong> {request.area || request.category}
                </p>
                <p style={{ margin: '8px 0', color: '#4a5568', lineHeight: '1.5' }}>
                  {request.description}
                </p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#718096' }}>
                  Submitted: {new Date(request.createdAt).toLocaleDateString()}
                  {request.updatedAt && ` • Updated: ${new Date(request.updatedAt).toLocaleDateString()}`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🆘</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Help Requests Yet</h3>
            <p>Submit your first help request using the form above.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (loading && !userData && isAuthenticated) {
      return (
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}></div>
          <div>Loading your academic dashboard...</div>
        </div>
      );
    }
    if (error) {
      return <div style={styles.error}>{error}</div>;
    }
    const tabRenderers = {
      'dashboard-pane': renderDashboard,
      'courses-pane': renderCourses,
      'modules-pane': renderModules,
      'resources-pane': renderResources,
      'assignments-pane': renderAssignments,
      'assessments-pane': renderAssessments,
      'tasks-pane': renderTasks,
      'projects-pane': renderProjects,
      'help-pane': renderHelpRequests,
      'notices-pane': renderNotices,
      'community-pane': renderCommunity,
      'profile-pane': renderProfile
    };
    const renderFunction = tabRenderers[activeTab] || renderDashboard;
    return renderFunction();
  };

  // Login form component
  const renderLoginForm = () => (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <h1 style={styles.loginTitle}>Academic Portal Login</h1>
        <p style={styles.loginSubtitle}>
          Access your personalized learning dashboard
        </p>
        <form onSubmit={handleLogin} style={styles.loginForm}>
          <div style={styles.formGroup}>
            <input
              type="text"
              placeholder="Enter your username"
              value={loginData.username}
              onChange={(e) => handleLoginInputChange('username', e.target.value)}
              style={styles.loginInput}
              required
              disabled={loading}
              onFocus={(e) => {
                e.target.style.borderColor = styles.loginInputFocus.borderColor;
                e.target.style.boxShadow = styles.loginInputFocus.boxShadow;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = styles.loginInput.borderColor;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div style={styles.formGroup}>
            <input
              type="password"
              placeholder="Enter your password"
              value={loginData.password}
              onChange={(e) => handleLoginInputChange('password', e.target.value)}
              style={styles.loginInput}
              required
              disabled={loading}
              onFocus={(e) => {
                e.target.style.borderColor = styles.loginInputFocus.borderColor;
                e.target.style.boxShadow = styles.loginInputFocus.boxShadow;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = styles.loginInput.borderColor;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.loginButton,
              ...(loading ? styles.loginButtonDisabled : {})
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = styles.loginButtonHover.backgroundColor;
                e.target.style.transform = styles.loginButtonHover.transform;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = styles.loginButton.backgroundColor;
                e.target.style.transform = 'none';
              }
            }}
          >
            {loading ? (
              <>
                <div style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px'
                }}></div>
                Authenticating...
              </>
            ) : (
              'Access Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );

  // Main dashboard component
  const renderDashboardLayout = () => (
    <div style={styles.container}>
      <div style={{
        ...styles.sidebar,
        ...(isMobile ? styles.sidebarMobile : {}),
        ...(isMobile && isMobileSidebarOpen ? styles.sidebarMobileOpen : {})
      }}>
        <div style={styles.welcomeSection}>
          <div style={styles.avatar}>
            {(userData?.name || 'ST')
              .split(' ')
              .map(n => (n && n[0]) || '')
              .join('')
              .toUpperCase()
            }
          </div>
          <div>
            <h1 style={styles.welcomeText}>
              {userData?.name || 'Loading Profile...'}
            </h1>
            <p style={styles.userInfo}>
              {userData?.program} • {userData?.semester}
            </p>
            <p style={styles.userDetails}>
              Track: {userData?.track}
            </p>
            <p style={styles.userDetails}>
              Student ID: {userData?.username}
            </p>
          </div>
        </div>
        <div style={styles.navTabs}>
          {navigationTabs.map((tab) => (
            <button
              key={tab.id}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => {
                setActiveTab(tab.id);
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              style={{
                ...styles.navTab,
                ...(activeTab === tab.id ? styles.navTabActive : {})
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = styles.navTabHover.background;
                  e.target.style.color = styles.navTabHover.color;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = styles.navTab.background;
                  e.target.style.color = styles.navTab.color;
                }
              }}
            >
              <span style={styles.navTabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleLogout}
          style={styles.logoutButton}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = styles.logoutButtonHover.backgroundColor;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = styles.logoutButton.backgroundColor;
          }}
        >
          Sign Out
        </button>
      </div>
      <div style={styles.mainContent}>
        {isMobile && (
          <button
            onClick={toggleMobileSidebar}
            style={styles.mobileMenuButton}
          >
            ☰
          </button>
        )}
        {renderTabContent()}
      </div>
    </div>
  );

  // Add CSS animations
  const animationStyles = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  // Modal component for viewing documents
  const renderDocumentModal = () => {
    if (!isModalOpen) return null;
    return <DocumentViewer url={selectedDocument} onClose={closeDocumentModal} />;
  };

  // Return appropriate component based on authentication state
  return (
    <>
      <style>{animationStyles}</style>
      {!isAuthenticated || !userData ? renderLoginForm() : renderDashboardLayout()}
      {renderDocumentModal()}
    </>
  );
};

export default UserDashboard;
