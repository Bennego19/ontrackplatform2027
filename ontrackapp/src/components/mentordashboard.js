import React, { useState, useEffect } from 'react';
import { mentorAuthAPI } from "../services/mentorAuthMiddleware";
import DocumentDownloadButton from './DocumentDownloadButton';

import { tokenManager } from '../services/authMiddleware';

const MentorDashboard = () => {
  // State management
  const [activeTab, setActiveTab] = useState('dashboard-pane');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  
  // Data states
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  
  // Form states
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'medium', assignedTo: '', status: 'pending' });
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '', maxScore: 100, course: '', instructions: '' });
  const [newProject, setNewProject] = useState({ title: '', description: '', startDate: '', endDate: '', status: 'planning' });
  const [newResource, setNewResource] = useState({ title: '', description: '', type: 'document', file: null, course: '' });
  
  // Edit states
  const [editingTask, setEditingTask] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileMessage, setProfileMessage] = useState('');

  // Form visibility states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  // Navigation configuration
  const navigationTabs = [
    { id: 'dashboard-pane', label: 'Dashboard', icon: '📊' },
    { id: 'students-pane', label: 'Students', icon: '👥' },
    { id: 'tasks-pane', label: 'Tasks', icon: '✅' },
    { id: 'assignments-pane', label: 'Assignments', icon: '📝' },
    { id: 'projects-pane', label: 'Projects', icon: '🚀' },
   { id: 'resources-pane', label: 'Resources', icon: '📋' },
    { id: 'mentorship-pane', label: 'Mentorship', icon: '🤝' },
    { id: 'profile-pane', label: 'Profile', icon: '👤' },
    { id: 'updateprofile-pane', label:'Update Profile', icon:''}
  ];

  // Authentication lifecycle
  useEffect(() => {
    const initializeAuth = () => {
      const token = tokenManager.getToken();
      const storedUser = tokenManager.getStoredUser();
      if (token && storedUser) {
        setUserData(storedUser);
        setIsAuthenticated(true);
        fetchMentorData();
      }
    };
    initializeAuth();
    // Restore the saved session once on mount; login loads data separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all mentor data when authenticated
  const fetchMentorData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchAssignedStudents(),
        fetchTasks(),
        fetchAssignments(),
        fetchProjects(),
        fetchResources()
      ]);
    } catch (err) {
      console.error('Error fetching mentor data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // API functions
  const fetchProfile = async () => {
    try {
      const profile = await mentorAuthAPI.getProfile();
      setUserData(profile);
      tokenManager.setStoredUser(profile);
    } catch { setError('Failed to load profile'); }
  };
  const fetchAssignedStudents = async () => {
    try {
      const students = await mentorAuthAPI.getAssignedStudents();
      setAssignedStudents(students);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load assigned students');
      setAssignedStudents([]);
    }
  };

  const fetchTasks = async () => {
    try {
      const tasksData = await mentorAuthAPI.getTasks();
      setTasks(tasksData);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setTasks([]);
      setError('Failed to load tasks');
    }
  };

  const fetchAssignments = async () => {
    try {
      const assignmentsData = await mentorAuthAPI.getAssignments();
      setAssignments(assignmentsData);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setAssignments([]);
      setError('Failed to load assignments');
    }
  };

  const fetchProjects = async () => {
    try {
      const projectsData = await mentorAuthAPI.getProjects();
      setProjects(projectsData);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
      setError('Failed to load projects');
    }
  };

  const fetchResources = async () => {
    try {
      const resourcesData = await mentorAuthAPI.getResources();
      setResources(resourcesData);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setResources([]);
      setError('Failed to load resources');
    }
  };

  // CRUD Operations for Tasks
  const createTask = async (e) => {
    e.preventDefault();
    try {
      const createdTask = await mentorAuthAPI.createTask(newTask);
      setTasks(prev => [...prev, createdTask]);
      setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', assignedTo: '', status: 'pending' });
      setShowTaskForm(false);
      setError('');
    } catch (err) {
      setError('Failed to create task');
    }
  };

  const updateTask = async (e) => {
    e.preventDefault();
    try {
      const updatedTask = await mentorAuthAPI.updateTask(editingTask.id, editingTask);
      setTasks(prev => prev.map(task => task.id === editingTask.id ? updatedTask : task));
      setEditingTask(null);
      setShowTaskForm(false);
      setError('');
    } catch (err) {
      setError('Failed to update task');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await mentorAuthAPI.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  // CRUD Operations for Assignments
  const createAssignment = async (e) => {
    e.preventDefault();
    try {
      const createdAssignment = await mentorAuthAPI.createAssignment(newAssignment);
      setAssignments(prev => [...prev, createdAssignment]);
      setNewAssignment({ title: '', description: '', dueDate: '', maxScore: 100, course: '', instructions: '' });
      setShowAssignmentForm(false);
      setError('');
    } catch (err) {
      setError('Failed to create assignment');
    }
  };

  const updateAssignment = async (e) => {
    e.preventDefault();
    try {
      const updatedAssignment = await mentorAuthAPI.updateAssignment(editingAssignment.id, editingAssignment);
      setAssignments(prev => prev.map(assignment =>
        assignment.id === editingAssignment.id ? updatedAssignment : assignment
      ));
      setEditingAssignment(null);
      setShowAssignmentForm(false);
      setError('');
    } catch (err) {
      setError('Failed to update assignment');
    }
  };

  const deleteAssignment = async (assignmentId) => {
    try {
      await mentorAuthAPI.deleteAssignment(assignmentId);
      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));
    } catch (err) {
      setError('Failed to delete assignment');
    }
  };

  // CRUD Operations for Projects
  const createProject = async (e) => {
    e.preventDefault();
    try {
      const createdProject = await mentorAuthAPI.createProject(newProject);
      setProjects(prev => [...prev, createdProject]);
      setNewProject({ title: '', description: '', startDate: '', endDate: '', status: 'planning' });
      setShowProjectForm(false);
      setError('');
    } catch (err) {
      setError('Failed to create project');
    }
  };

  const updateProject = async (e) => {
    e.preventDefault();
    try {
      const updatedProject = await mentorAuthAPI.updateProject(editingProject.id, editingProject);
      setProjects(prev => prev.map(project =>
        project.id === editingProject.id ? updatedProject : project
      ));
      setEditingProject(null);
      setShowProjectForm(false);
      setError('');
    } catch (err) {
      setError('Failed to update project');
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await mentorAuthAPI.deleteProject(projectId);
      setProjects(prev => prev.filter(project => project.id !== projectId));
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  // Resource Management
  const uploadResource = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', newResource.title);
      formData.append('description', newResource.description);
      formData.append('type', newResource.type);
      formData.append('course', newResource.course);
      if (newResource.file) {
        formData.append('document', newResource.file);
      }

      const uploadedResource = await mentorAuthAPI.uploadResource(formData);
      setResources(prev => [...prev, uploadedResource]);
      setNewResource({ title: '', description: '', type: 'document', file: null, course: '' });
      setShowResourceForm(false);
      setError('');
    } catch (err) {
      setError('Failed to upload resource');
    }
  };

  const deleteResource = async (resourceId) => {
    try {
      await mentorAuthAPI.deleteResource(resourceId);
      setResources(prev => prev.filter(resource => resource.id !== resourceId));
    } catch (err) {
      setError('Failed to delete resource');
    }
  };

  // Authentication handlers
  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loginResult = await mentorAuthAPI.login(loginData.username, loginData.password);
      tokenManager.setToken(loginResult.token);
      const userDataFromResponse = loginResult.user || loginResult;
      tokenManager.setStoredUser(userDataFromResponse);
      setUserData(userDataFromResponse);
      setIsAuthenticated(true);
      fetchMentorData();
    } catch (err) {
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
    setAssignedStudents([]);
    setTasks([]);
    setAssignments([]);
    setProjects([]);
    setResources([]);
    setLoginData({ username: '', password: '' });
    setError('');
  };

  const handleLoginInputChange = (field, value) => {
    setLoginData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError('');
  };

  // Component styles
  const styles = {
    loginContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '20px'
    },
    loginCard: {
      backgroundColor: '#ffffff',
      padding: '40px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      width: '100%',
      maxWidth: '400px'
    },
    loginTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#1a202c',
      marginBottom: '8px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    loginSubtitle: {
      fontSize: '14px',
      color: '#718096',
      marginBottom: '24px',
      textAlign: 'center'
    },
    loginForm: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    formGroup: {
      marginBottom: '16px'
    },
    loginInput: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      backgroundColor: '#ffffff'
    },
    loginInputFocus: {
      outline: 'none',
      borderColor: '#4299e1',
      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.1)'
    },
    loginButton: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: '#4299e1',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit'
    },
    loginButtonHover: {
      backgroundColor: '#3182ce',
      transform: 'translateY(-1px)'
    },
    loginButtonDisabled: {
      backgroundColor: '#a0aec0',
      cursor: 'not-allowed',
      transform: 'none'
    },
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    },
    sidebar: {
      width: '300px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    welcomeSection: {
      marginBottom: '24px',
      paddingBottom: '24px',
      borderBottom: '1px solid #e2e8f0'
    },
    avatar: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '16px'
    },
    welcomeText: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1a202c',
      marginBottom: '4px',
      lineHeight: '1.4'
    },
    userInfo: {
      fontSize: '14px',
      color: '#4a5568',
      marginBottom: '4px',
      lineHeight: '1.4'
    },
    userDetails: {
      fontSize: '12px',
      color: '#718096',
      marginBottom: '2px',
      lineHeight: '1.4'
    },
    navTabs: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginTop: '20px',
      flex: '1'
    },
    navTab: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '14px',
      fontWeight: '500',
      color: '#4a5568',
      fontFamily: 'inherit',
      textAlign: 'left'
    },
    navTabHover: {
      backgroundColor: '#f7fafc',
      color: '#1a202c'
    },
    navTabActive: {
      backgroundColor: '#ebf8ff',
      color: '#2b6cb0',
      fontWeight: '600'
    },
    navTabIcon: {
      fontSize: '16px',
      width: '20px',
      textAlign: 'center'
    },
    logoutButton: {
      padding: '12px 16px',
      backgroundColor: '#e53e3e',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      marginTop: 'auto',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit'
    },
    logoutButtonHover: {
      backgroundColor: '#c53030'
    },
    mainContent: {
      flex: '1',
      padding: '32px',
      overflowY: 'auto',
      backgroundColor: '#f8fafc'
    },
    contentHeader: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1a202c',
      marginBottom: '8px',
      lineHeight: '1.2'
    },
    subtitle: {
      fontSize: '16px',
      color: '#718096',
      marginBottom: '24px',
      lineHeight: '1.5'
    },
    userInfoCard: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.2s ease'
    },
    userInfoCardHover: {
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px'
    },
    infoItem: {
      marginBottom: '16px'
    },
    infoLabel: {
      fontSize: '12px',
      color: '#718096',
      fontWeight: '600',
      marginBottom: '6px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    infoValue: {
      fontSize: '16px',
      color: '#1a202c',
      fontWeight: '600',
      lineHeight: '1.4'
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      fontSize: '16px',
      color: '#718096',
      flexDirection: 'column',
      gap: '12px'
    },
    loadingSpinner: {
      width: '32px',
      height: '32px',
      border: '3px solid #e2e8f0',
      borderTop: '3px solid #4299e1',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    error: {
      backgroundColor: '#fed7d7',
      color: '#c53030',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #feb2b2',
      fontSize: '14px',
      lineHeight: '1.5'
    },
    resourcesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '20px',
      marginTop: '20px'
    },
    resourceCard: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '20px',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    },
    resourceCardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
      borderColor: '#4299e1'
    },
    resourceTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1a202c',
      marginBottom: '8px',
      lineHeight: '1.4'
    },
    resourceDescription: {
      fontSize: '14px',
      color: '#718096',
      marginBottom: '16px',
      lineHeight: '1.5'
    },
    resourceMeta: {
      fontSize: '12px',
      color: '#a0aec0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#718096'
    },
    quickActionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginTop: '16px'
    },
    actionItem: {
      padding: '16px',
      backgroundColor: '#f7fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      transition: 'all 0.2s ease'
    },
    actionItemHover: {
      backgroundColor: '#edf2f7',
      transform: 'translateY(-1px)'
    },
    cardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
      marginTop: '20px'
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '24px',
      transition: 'all 0.2s ease'
    },
    form: {
      backgroundColor: '#ffffff',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      marginBottom: '24px'
    },
    formLabel: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: '#2d3748'
    },
    formInput: {
      width: '100%',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    formSelect: {
      width: '100%',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    formTextarea: {
      width: '100%',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical'
    },
    formButton: {
      padding: '12px 24px',
      backgroundColor: '#4299e1',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600'
    },
    formButtonSecondary: {
      padding: '12px 24px',
      backgroundColor: '#e2e8f0',
      color: '#4a5568',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      marginLeft: '8px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    tableHeader: {
      backgroundColor: '#f7fafc',
      padding: '12px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#2d3748',
      borderBottom: '1px solid #e2e8f0'
    },
    tableCell: {
      padding: '12px',
      borderBottom: '1px solid #e2e8f0'
    },
    actionButton: {
      padding: '6px 12px',
      margin: '0 4px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    editButton: {
      backgroundColor: '#4299e1',
      color: 'white'
    },
    deleteButton: {
      backgroundColor: '#e53e3e',
      color: 'white'
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600'
    },
    badgeHigh: {
      backgroundColor: '#fed7d7',
      color: '#c53030'
    },
    badgeMedium: {
      backgroundColor: '#feebc8',
      color: '#dd6b20'
    },
    badgeLow: {
      backgroundColor: '#c6f6d5',
      color: '#276749'
    },
    badgeCompleted: {
      backgroundColor: '#c6f6d5',
      color: '#276749'
    },
    badgeInProgress: {
      backgroundColor: '#feebc8',
      color: '#dd6b20'
    },
    badgePlanning: {
      backgroundColor: '#e9d8fd',
      color: '#553c9a'
    }
  };

  // Render functions for each tab
  const renderDashboard = () => (
    <div>
      <div>
        <h1 style={styles.contentHeader}>Mentor Dashboard</h1>
        <p style={styles.subtitle}>
          Overview of your mentoring activities and student progress
        </p>
      </div>
      
      <div style={styles.cardsGrid}>
        <div 
          style={styles.card}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
        >
          <h3>Assigned Students</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#4299e1' }}>
            {assignedStudents.length}
          </p>
          <p style={styles.userDetails}>Currently assigned</p>
        </div>
        <div 
          style={styles.card}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
        >
          <h3>Active Tasks</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>
            {tasks.filter(t => t.status === 'pending').length}
          </p>
          <p style={styles.userDetails}>Require attention</p>
        </div>
        <div 
          style={styles.card}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
        >
          <h3>Current Assignments</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ed8936' }}>
            {assignments.length}
          </p>
          <p style={styles.userDetails}>Active assignments</p>
        </div>
        <div 
          style={styles.card}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          }}
        >
          <h3>Active Projects</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#9f7aea' }}>
            {projects.filter(p => p.status === 'in-progress').length}
          </p>
          <p style={styles.userDetails}>In progress</p>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div 
        style={styles.userInfoCard}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = styles.userInfoCardHover.boxShadow;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = styles.userInfoCard.boxShadow;
        }}
      >
        <h3 style={{ marginBottom: '20px', color: '#1a202c', fontSize: '20px' }}>
          Recent Activity
        </h3>
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
            <div style={styles.infoLabel}>Pending Reviews</div>
            <div style={styles.infoValue}>Not available</div>
          </div>
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
            <div style={styles.infoLabel}>Upcoming Deadlines</div>
            <div style={styles.infoValue}>Not available</div>
          </div>
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
            <div style={styles.infoLabel}>Student Messages</div>
            <div style={styles.infoValue}>Not available</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudents = () => (
    <div>
      <h1 style={styles.contentHeader}>Assigned Students</h1>
      <p style={styles.subtitle}>Manage and monitor your assigned students</p>
      
      <div style={styles.userInfoCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.tableHeader}>Student Name</th>
              <th style={styles.tableHeader}>Program</th>
              <th style={styles.tableHeader}>Track</th>
              <th style={styles.tableHeader}>Email</th>
                       </tr>
          </thead>
          <tbody>
            {assignedStudents.map(student => (
              <tr key={student.id}>
                <td style={styles.tableCell}>
                  <div style={{ fontWeight: '600' }}>{student.name}</div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>ID: {student.studentId}</div>
                </td>
                <td style={styles.tableCell}>{student.program}</td>
                <td style={styles.tableCell}>{student.track}</td>
                <td style={styles.tableCell}>{student.email}</td>
                <td style={styles.tableCell}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '100%',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      flex: 1
                    }}>
                      <div style={{
                        width: `${student.progress || 0}%`,
                        backgroundColor: student.progress >= 70 ? '#48bb78' : student.progress >= 40 ? '#ed8936' : '#e53e3e',
                        height: '8px',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    
                  </div>
                </td>
                             </tr>
            ))}
          </tbody>
        </table>
        
        {assignedStudents.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Students Assigned</h3>
            <p>Students will appear here once they are assigned to you.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={styles.contentHeader}>Task Management</h1>
          <p style={styles.subtitle}>Create and manage tasks for students</p>
        </div>
        <button 
          style={styles.formButton}
          onClick={() => setShowTaskForm(true)}
        >
          + Create Task
        </button>
      </div>

      {/* Task Form */}
      {showTaskForm && (
        <div style={styles.form}>
          <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
          <form onSubmit={editingTask ? updateTask : createTask}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Title *</label>
              <input
                type="text"
                value={editingTask ? editingTask.title : newTask.title}
                onChange={(e) => editingTask 
                  ? setEditingTask({...editingTask, title: e.target.value})
                  : setNewTask({...newTask, title: e.target.value})
                }
                style={styles.formInput}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description *</label>
              <textarea
                value={editingTask ? editingTask.description : newTask.description}
                onChange={(e) => editingTask
                  ? setEditingTask({...editingTask, description: e.target.value})
                  : setNewTask({...newTask, description: e.target.value})
                }
                style={styles.formTextarea}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Due Date *</label>
                <input
                  type="date"
                  value={editingTask ? editingTask.dueDate : newTask.dueDate}
                  onChange={(e) => editingTask
                    ? setEditingTask({...editingTask, dueDate: e.target.value})
                    : setNewTask({...newTask, dueDate: e.target.value})
                  }
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Priority *</label>
                <select
                  value={editingTask ? editingTask.priority : newTask.priority}
                  onChange={(e) => editingTask
                    ? setEditingTask({...editingTask, priority: e.target.value})
                    : setNewTask({...newTask, priority: e.target.value})
                  }
                  style={styles.formSelect}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Assigned To</label>
                <select
                  value={editingTask ? editingTask.assignedTo : newTask.assignedTo}
                  onChange={(e) => editingTask
                    ? setEditingTask({...editingTask, assignedTo: e.target.value})
                    : setNewTask({...newTask, assignedTo: e.target.value})
                  }
                  style={styles.formSelect}
                >
                  <option value="">All Students</option>
                  {assignedStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Status</label>
                <select
                  value={editingTask ? editingTask.status : newTask.status}
                  onChange={(e) => editingTask
                    ? setEditingTask({...editingTask, status: e.target.value})
                    : setNewTask({...newTask, status: e.target.value})
                  }
                  style={styles.formSelect}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={styles.formButton}>
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
              <button 
                type="button" 
                style={styles.formButtonSecondary}
                onClick={() => {
                  setEditingTask(null);
                  setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', assignedTo: '', status: 'pending' });
                  setShowTaskForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks List */}
      <div style={styles.userInfoCard}>
        <h3>Task List ({tasks.length} tasks)</h3>
        
        {tasks.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Title</th>
                <th style={styles.tableHeader}>Assigned To</th>
                <th style={styles.tableHeader}>Due Date</th>
                <th style={styles.tableHeader}>Priority</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id}>
                  <td style={styles.tableCell}>
                    <div style={{ fontWeight: '600' }}>{task.title}</div>
                    <div style={{ fontSize: '12px', color: '#718096' }}>
                      {task.description.substring(0, 50)}...
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    {task.assignedTo ? 
                      assignedStudents.find(s => s.id === task.assignedTo)?.name || 'Unknown' :
                      'All Students'
                    }
                  </td>
                  <td style={styles.tableCell}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </td>
                  <td style={styles.tableCell}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(task.priority === 'high' ? styles.badgeHigh :
                          task.priority === 'medium' ? styles.badgeMedium : styles.badgeLow)
                    }}>
                      {task.priority}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(task.status === 'completed' ? styles.badgeCompleted :
                          task.status === 'in-progress' ? styles.badgeInProgress : styles.badgePlanning)
                    }}>
                      {task.status}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <button 
                      style={{...styles.actionButton, ...styles.editButton}}
                      onClick={() => {
                        setEditingTask(task);
                        setShowTaskForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      style={{...styles.actionButton, ...styles.deleteButton}}
                      onClick={() => deleteTask(task.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Tasks Created</h3>
            <p>Create your first task to get started with task management.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAssignments = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={styles.contentHeader}>Assignment Management</h1>
          <p style={styles.subtitle}>Create and manage academic assignments</p>
        </div>
        <button 
          style={styles.formButton}
          onClick={() => setShowAssignmentForm(true)}
        >
          + Create Assignment
        </button>
      </div>

      {/* Assignment Form */}
      {showAssignmentForm && (
        <div style={styles.form}>
          <h3>{editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</h3>
          <form onSubmit={editingAssignment ? updateAssignment : createAssignment}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Title *</label>
              <input
                type="text"
                value={editingAssignment ? editingAssignment.title : newAssignment.title}
                onChange={(e) => editingAssignment
                  ? setEditingAssignment({...editingAssignment, title: e.target.value})
                  : setNewAssignment({...newAssignment, title: e.target.value})
                }
                style={styles.formInput}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description *</label>
              <textarea
                value={editingAssignment ? editingAssignment.description : newAssignment.description}
                onChange={(e) => editingAssignment
                  ? setEditingAssignment({...editingAssignment, description: e.target.value})
                  : setNewAssignment({...newAssignment, description: e.target.value})
                }
                style={styles.formTextarea}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Instructions</label>
              <textarea
                value={editingAssignment ? editingAssignment.instructions : newAssignment.instructions}
                onChange={(e) => editingAssignment
                  ? setEditingAssignment({...editingAssignment, instructions: e.target.value})
                  : setNewAssignment({...newAssignment, instructions: e.target.value})
                }
                style={styles.formTextarea}
                placeholder="Provide detailed instructions for the assignment..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Due Date *</label>
                <input
                  type="date"
                  value={editingAssignment ? editingAssignment.dueDate : newAssignment.dueDate}
                  onChange={(e) => editingAssignment
                    ? setEditingAssignment({...editingAssignment, dueDate: e.target.value})
                    : setNewAssignment({...newAssignment, dueDate: e.target.value})
                  }
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Max Score</label>
                <input
                  type="number"
                  value={editingAssignment ? editingAssignment.maxScore : newAssignment.maxScore}
                  onChange={(e) => editingAssignment
                    ? setEditingAssignment({...editingAssignment, maxScore: parseInt(e.target.value)})
                    : setNewAssignment({...newAssignment, maxScore: parseInt(e.target.value)})
                  }
                  style={styles.formInput}
                  min="0"
                  max="1000"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Course</label>
              <input
                type="text"
                value={editingAssignment ? editingAssignment.course : newAssignment.course}
                onChange={(e) => editingAssignment
                  ? setEditingAssignment({...editingAssignment, course: e.target.value})
                  : setNewAssignment({...newAssignment, course: e.target.value})
                }
                style={styles.formInput}
                placeholder="e.g., CS101, DS202"
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={styles.formButton}>
                {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
              </button>
              <button 
                type="button" 
                style={styles.formButtonSecondary}
                onClick={() => {
                  setEditingAssignment(null);
                  setNewAssignment({ title: '', description: '', dueDate: '', maxScore: 100, course: '', instructions: '' });
                  setShowAssignmentForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assignments List */}
      <div style={styles.userInfoCard}>
        <h3>Assignment List ({assignments.length} assignments)</h3>
        
        {assignments.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Title</th>
                <th style={styles.tableHeader}>Course</th>
                <th style={styles.tableHeader}>Due Date</th>
                <th style={styles.tableHeader}>Max Score</th>
                <th style={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => (
                <tr key={assignment.id}>
                  <td style={styles.tableCell}>
                    <div style={{ fontWeight: '600' }}>{assignment.title}</div>
                    <div style={{ fontSize: '12px', color: '#718096' }}>
                      {assignment.description.substring(0, 60)}...
                    </div>
                  </td>
                  <td style={styles.tableCell}>{assignment.course}</td>
                  <td style={styles.tableCell}>
                    {new Date(assignment.dueDate).toLocaleDateString()}
                  </td>
                  <td style={styles.tableCell}>{assignment.maxScore}</td>
                  <td style={styles.tableCell}>
                    <button 
                      style={{...styles.actionButton, ...styles.editButton}}
                      onClick={() => {
                        setEditingAssignment(assignment);
                        setShowAssignmentForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      style={{...styles.actionButton, ...styles.deleteButton}}
                      onClick={() => deleteAssignment(assignment.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Assignments Created</h3>
            <p>Create your first assignment to get started.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderProjects = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={styles.contentHeader}>Project Management</h1>
          <p style={styles.subtitle}>Create and manage student projects</p>
        </div>
        <button 
          style={styles.formButton}
          onClick={() => setShowProjectForm(true)}
        >
          + Create Project
        </button>
      </div>

      {/* Project Form */}
      {showProjectForm && (
        <div style={styles.form}>
          <h3>{editingProject ? 'Edit Project' : 'Create New Project'}</h3>
          <form onSubmit={editingProject ? updateProject : createProject}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Title *</label>
              <input
                type="text"
                value={editingProject ? editingProject.title : newProject.title}
                onChange={(e) => editingProject
                  ? setEditingProject({...editingProject, title: e.target.value})
                  : setNewProject({...newProject, title: e.target.value})
                }
                style={styles.formInput}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description *</label>
              <textarea
                value={editingProject ? editingProject.description : newProject.description}
                onChange={(e) => editingProject
                  ? setEditingProject({...editingProject, description: e.target.value})
                  : setNewProject({...newProject, description: e.target.value})
                }
                style={styles.formTextarea}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Start Date *</label>
                <input
                  type="date"
                  value={editingProject ? editingProject.startDate : newProject.startDate}
                  onChange={(e) => editingProject
                    ? setEditingProject({...editingProject, startDate: e.target.value})
                    : setNewProject({...newProject, startDate: e.target.value})
                  }
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>End Date *</label>
                <input
                  type="date"
                  value={editingProject ? editingProject.endDate : newProject.endDate}
                  onChange={(e) => editingProject
                    ? setEditingProject({...editingProject, endDate: e.target.value})
                    : setNewProject({...newProject, endDate: e.target.value})
                  }
                  style={styles.formInput}
                  required
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Status</label>
              <select
                value={editingProject ? editingProject.status : newProject.status}
                onChange={(e) => editingProject
                  ? setEditingProject({...editingProject, status: e.target.value})
                  : setNewProject({...newProject, status: e.target.value})
                }
                style={styles.formSelect}
              >
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={styles.formButton}>
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
              <button 
                type="button" 
                style={styles.formButtonSecondary}
                onClick={() => {
                  setEditingProject(null);
                  setNewProject({ title: '', description: '', startDate: '', endDate: '', status: 'planning' });
                  setShowProjectForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      <div style={styles.userInfoCard}>
        <h3>Project List ({projects.length} projects)</h3>
        
        {projects.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Title</th>
                <th style={styles.tableHeader}>Start Date</th>
                <th style={styles.tableHeader}>End Date</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id}>
                  <td style={styles.tableCell}>
                    <div style={{ fontWeight: '600' }}>{project.title}</div>
                    <div style={{ fontSize: '12px', color: '#718096' }}>
                      {project.description.substring(0, 60)}...
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    {new Date(project.startDate).toLocaleDateString()}
                  </td>
                  <td style={styles.tableCell}>
                    {new Date(project.endDate).toLocaleDateString()}
                  </td>
                  <td style={styles.tableCell}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(project.status === 'completed' ? styles.badgeCompleted :
                          project.status === 'in-progress' ? styles.badgeInProgress : styles.badgePlanning)
                    }}>
                      {project.status}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <button 
                      style={{...styles.actionButton, ...styles.editButton}}
                      onClick={() => {
                        setEditingProject(project);
                        setShowProjectForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      style={{...styles.actionButton, ...styles.deleteButton}}
                      onClick={() => deleteProject(project.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Projects Created</h3>
            <p>Create your first project to get started.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderResources = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={styles.contentHeader}>Resource Management</h1>
          <p style={styles.subtitle}>Upload and manage learning resources</p>
        </div>
        <button 
          style={styles.formButton}
          onClick={() => setShowResourceForm(true)}
        >
          + Upload Resource
        </button>
      </div>

      {/* Resource Form */}
      {showResourceForm && (
        <div style={styles.form}>
          <h3>Upload New Resource</h3>
          <form onSubmit={uploadResource}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Title *</label>
              <input
                type="text"
                value={newResource.title}
                onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                style={styles.formInput}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Description *</label>
              <textarea
                value={newResource.description}
                onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                style={styles.formTextarea}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Type</label>
                <select
                  value={newResource.type}
                  onChange={(e) => setNewResource({...newResource, type: e.target.value})}
                  style={styles.formSelect}
                >
                  <option value="document">Document</option>
                  <option value="presentation">Presentation</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Course</label>
                <input
                  type="text"
                  value={newResource.course}
                  onChange={(e) => setNewResource({...newResource, course: e.target.value})}
                  style={styles.formInput}
                  placeholder="e.g., CS101, DS202"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>File</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.ppt,.pptx,.xls,.xlsx"
                required
                onChange={(e) => setNewResource({...newResource, file: e.target.files[0]})}
                style={styles.formInput}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" style={styles.formButton}>
                Upload Resource
              </button>
              <button 
                type="button" 
                style={styles.formButtonSecondary}
                onClick={() => {
                  setNewResource({ title: '', description: '', type: 'document', file: null, course: '' });
                  setShowResourceForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resources List */}
      <div style={styles.userInfoCard}>
        <h3>Resource Library ({resources.length} resources)</h3>
        
        {resources.length > 0 ? (
          <div style={styles.resourcesGrid}>
            {resources.map(resource => (
              <div 
                key={resource.id} 
                style={styles.resourceCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = styles.resourceCardHover.transform;
                  e.currentTarget.style.boxShadow = styles.resourceCardHover.boxShadow;
                  e.currentTarget.style.borderColor = styles.resourceCardHover.borderColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = styles.resourceCard.boxShadow;
                  e.currentTarget.style.borderColor = styles.resourceCard.borderColor;
                }}
              >
                <div style={styles.resourceTitle}>
                  {resource.title}
                </div>
                <div style={styles.resourceDescription}>
                  {resource.description}
                </div>
                <div style={styles.resourceMeta}>
                  <span>Type: {resource.type}</span>
                  <span>Uploaded: {new Date(resource.createdAt).toLocaleDateString()}</span>
                </div>
                {resource.document?.relativePath && <DocumentDownloadButton url={resource.document.relativePath}>Download</DocumentDownloadButton>}
                <button 
                  style={{...styles.actionButton, ...styles.deleteButton, marginTop: '10px'}}
                  onClick={() => deleteResource(resource.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ color: '#1a202c', marginBottom: '8px' }}>No Resources Uploaded</h3>
            <p>Upload your first resource to share with students.</p>
          </div>
        )}
      </div>
    </div>
  );

 

  const renderMentorship = () => (
    <div>
      <h1 style={styles.contentHeader}>Mentorship</h1>
      <p style={styles.subtitle}>You have {assignedStudents.length} assigned students.</p>
      <p>Session scheduling is not yet available.</p>
    </div>
  );
  const renderProfile = () => (
    <div>
      <h1 style={styles.contentHeader}>Mentor Profile</h1>
      <p style={styles.subtitle}>Your professional information and account details</p>
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
              <div style={styles.infoValue}>{userData.name || 'Mentor User'}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Email</div>
              <div style={styles.infoValue}>{userData.email || 'mentor@example.com'}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Specialization</div>
              <div style={styles.infoValue}>{userData.specialization || 'Not specified'}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Assigned Programs</div>
              <div style={styles.infoValue}>{userData.programs?.join(', ') || 'Not specified'}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Students Assigned</div>
              <div style={styles.infoValue}>{assignedStudents.length}</div>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Active Tasks</div>
              <div style={styles.infoValue}>{tasks.filter(t => t.status === 'pending').length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderUpdateProfile = () => (
    <div>
      <h1 style={styles.contentHeader}>Update Profile</h1>
      <p style={styles.subtitle}>Update your professional information</p>

      <div style={styles.form}>
        <h3>Edit Profile Information</h3>
        {profileMessage && <p role="status">{profileMessage}</p>}
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            const data = { ...userData, ...editingProfile };
            const profile = await mentorAuthAPI.updateProfile({ name: data.name, email: data.email, specialization: data.specialization || '', bio: data.bio || '' });
            setUserData(profile);
            tokenManager.setStoredUser(profile);
            setEditingProfile(null);
            setProfileMessage('Profile updated.');
            setError('');
          } catch { setProfileMessage('Unable to update profile.'); }
        }}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Full Name *</label>
            <input
              type="text"
              value={editingProfile?.name ?? userData?.name ?? ''}
              onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
              style={styles.formInput}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Email *</label>
            <input
              type="email"
              value={editingProfile?.email ?? userData?.email ?? ''}
              onChange={(e) => setEditingProfile({...editingProfile, email: e.target.value})}
              style={styles.formInput}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Specialization</label>
            <input
              type="text"
              value={editingProfile?.specialization ?? userData?.specialization ?? ''}
              onChange={(e) => setEditingProfile({...editingProfile, specialization: e.target.value})}
              style={styles.formInput}
              placeholder="e.g., Computer Science, Data Science"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Bio</label>
            <textarea
              value={editingProfile?.bio ?? userData?.bio ?? ''}
              onChange={(e) => setEditingProfile({...editingProfile, bio: e.target.value})}
              style={styles.formTextarea}
              placeholder="Brief description about yourself..."
              rows="4"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" style={styles.formButton}>
              Update Profile
            </button>
            <button
              type="button"
              style={styles.formButtonSecondary}
              onClick={() => setEditingProfile(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (loading && !userData) {
      return (
        <div style={styles.loading}>
          <div style={styles.loadingSpinner}></div>
          <div>Loading your mentor dashboard...</div>
        </div>
      );
    }
    const tabRenderers = {
      'dashboard-pane': renderDashboard,
      'students-pane': renderStudents,
      'tasks-pane': renderTasks,
      'assignments-pane': renderAssignments,
      'projects-pane': renderProjects,
      'resources-pane': renderResources,
      'mentorship-pane': renderMentorship,
      'profile-pane': renderProfile,
      'updateprofile-pane': renderUpdateProfile
    };
    const renderFunction = tabRenderers[activeTab] || renderDashboard;
    return renderFunction();
  };

  // Login form component
  const renderLoginForm = () => (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <h1 style={styles.loginTitle}>Mentor Portal Login</h1>
        <p style={styles.loginSubtitle}>
          Access your mentor management dashboard
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
              'Access Mentor Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );

  // Main dashboard component
  const renderDashboardLayout = () => (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.welcomeSection}>
          <div style={styles.avatar}>
            {userData ? 
              (userData.name || 'Mentor User')
                .split(' ')
                .map(name => name[0])
                .join('')
                .toUpperCase() 
              : 'MT'
            }
          </div>
          <div>
            <h1 style={styles.welcomeText}>
              {[userData?.name, userData?.surname].filter(Boolean).join(' ') || 'Loading Profile...'}
            </h1>
            <p style={styles.userInfo}>
              Mentor • {userData?.specialization || 'Not specified'}
            </p>
            <p style={styles.userDetails}>
              Students: {assignedStudents.length}
            </p>
            <p style={styles.userDetails}>
              Active Tasks: {tasks.filter(t => t.status === 'pending').length}
            </p>
          </div>
        </div>
        <div style={styles.navTabs}>
          {navigationTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.navTab,
                ...(activeTab === tab.id ? styles.navTabActive : {})
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = styles.navTabHover.backgroundColor;
                  e.target.style.color = styles.navTabHover.color;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = styles.navTab.backgroundColor;
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
        {error && <div role="alert" style={styles.error}>{error} <button type="button" onClick={() => setError('')}>Dismiss</button></div>}
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

  // Return appropriate component based on authentication state
  return (
    <>
      <style>{animationStyles}</style>
      {!isAuthenticated ? renderLoginForm() : renderDashboardLayout()}
    </>
  );
};

export default MentorDashboard;
