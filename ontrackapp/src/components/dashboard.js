import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Dashboard.css';
import { useDashboardApi, usePublicApi } from '../hooks/useApi';
import { tokenManager } from '../services/authMiddleware';
import { authAPI } from '../services/authMiddleware';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loadPhase, setLoadPhase] = useState(1);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ONLY LOAD DASHBOARD DATA WHEN AUTHENTICATED AS ADMIN
  const shouldLoadDashboardData = isAuthenticated && userData?.role === 'admin';

  // Phase 1: Core metrics - only load if authenticated as admin
  const { data: totalStudentsData, loading: studentsLoading } = useDashboardApi(
    shouldLoadDashboardData ? '/onboardstudents/total-students' : null
  );
  const { data: totalMentorsData, loading: mentorsLoading } = useDashboardApi(
    shouldLoadDashboardData ? '/onboardmentors/total-mentors' : null
  );
  const { data: programTotalsData, loading: programsLoading } = useDashboardApi(
    shouldLoadDashboardData ? '/onboardstudents/totals-by-programs' : null
  );
  const { data: trackTotalsData, loading: tracksLoading } = useDashboardApi(
    shouldLoadDashboardData ? '/onboardstudents/totals-by-tracks' : null
  );

  // Phase 2: Additional metrics - only load if authenticated as admin
  const { data: totalAssessmentsData, loading: assessmentsLoading } = usePublicApi(
    shouldLoadDashboardData && loadPhase >= 2 ? '/assessments/total' : null
  );
  const { data: totalCohortsData, loading: cohortsLoading } = useDashboardApi(
    shouldLoadDashboardData && loadPhase >= 2 ? '/cohorts/total' : null
  );
  const { data: activeAssignmentsData, loading: assignmentsLoading } = useDashboardApi(
    shouldLoadDashboardData && loadPhase >= 2 ? '/mentorstudentassignment/active-count' : null
  );

  // Phase 3: Detailed breakdowns - only load if authenticated as admin
  const { data: internshipTracksApiData, loading: internshipTracksLoading } = useDashboardApi(
    shouldLoadDashboardData && loadPhase >= 3 ? '/onboardstudents/internship-tracks-distribution' : null
  );
  const { data: mentorshipTracksApiData, loading: mentorshipTracksLoading } = useDashboardApi(
    shouldLoadDashboardData && loadPhase >= 3 ? '/onboardstudents/mentorship-tracks-distribution' : null
  );
  const { data: mentorsByTrackData, loading: mentorsTrackLoading } = useDashboardApi(
    shouldLoadDashboardData && loadPhase >= 3 ? '/onboardmentors/mentors-by-track' : null
  );
  const { data: assessmentTotalsByProgramData, loading: assessmentProgramsLoading } = usePublicApi(
    shouldLoadDashboardData && loadPhase >= 3 ? '/assessments/totals-by-program' : null
  );

  // Control loading phases - only if loading dashboard data
  useEffect(() => {
    if (!shouldLoadDashboardData) return;
    
    if (loadPhase === 1 && !studentsLoading && !mentorsLoading && !programsLoading && !tracksLoading) {
      setLoadPhase(2);
    } else if (loadPhase === 2 && !assessmentsLoading && !cohortsLoading && !assignmentsLoading) {
      setLoadPhase(3);
    }
  }, [
    loadPhase, shouldLoadDashboardData,
    studentsLoading, mentorsLoading, programsLoading, tracksLoading, 
    assessmentsLoading, cohortsLoading, assignmentsLoading
  ]);

  // Extract data from API responses - only if data exists
  const totalStudents = totalStudentsData?.total || 0;
  const totalMentors = totalMentorsData?.total || 0;
  const programTotals = programTotalsData?.totals || {};
  const trackTotals = trackTotalsData?.totals || {};
  const internshipTracksData = internshipTracksApiData?.tracks || {};
  const mentorshipTracksData = mentorshipTracksApiData?.tracks || {};
  const mentorsByTrack = mentorsByTrackData?.mentorsByTrack || {};
  const totalAssessments = totalAssessmentsData?.total || 0;
  const totalCohorts = totalCohortsData?.total || 0;
  const activeAssignments = activeAssignmentsData?.count || 0;
  const assessmentTotalsByProgram = assessmentTotalsByProgramData?.totals || {};

  // Helper functions - only used when authenticated as admin
  const getProgramCount = (programName) => programTotals[programName] || 0;
  const getMentorCount = (trackName) => mentorsByTrack[trackName] || 0;

  // Data arrays - only used when authenticated as admin
  const programs = [
    { name: 'Mentorship Program', key: 'Mentorship Program' },
    { name: 'Internship Program', key: 'Internship Program' },
    { name: 'Skill Development Program', key: 'Skill Development Program' },
    { name: 'Graduate Program', key: 'Graduate Program' }
  ];

  const mentorshipTracks = [
    { name: 'Web Development', key: 'Web Development' },
    { name: 'Java Programming', key: 'Java Programming' },
    { name: 'C# Programming', key: 'C# Programming' },
    { name: 'Python Programming', key: 'Python Programming' }
  ];

  const internshipTracks = [
    { name: 'Web Development', key: 'Web Development' },
    { name: 'Java Programming', key: 'Java Programming' },
    { name: 'C# Programming', key: 'C# Programming' },
    { name: 'Python Programming', key: 'Python Programming' }
  ];

  // Calculate derived values - only used when authenticated as admin
  const skillsDevTotal = getProgramCount('Skill Development Program');

  // Combined loading state for dashboard - only when loading dashboard data
  const dashboardLoading = shouldLoadDashboardData && (
    studentsLoading || mentorsLoading || programsLoading || tracksLoading ||
    internshipTracksLoading || mentorshipTracksLoading || mentorsTrackLoading ||
    assessmentsLoading || cohortsLoading || assignmentsLoading || assessmentProgramsLoading
  );

  // Check authentication on component mount - FIXED VERSION
  useEffect(() => {
    let isMounted = true;
    let authCheckCount = 0;
    const MAX_AUTH_CHECKS = 3;
    
    const checkAuth = async () => {
      // Prevent too many auth checks
      if (authCheckCount >= MAX_AUTH_CHECKS) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      authCheckCount++;
      
      try {
        const token = tokenManager.getToken();
        if (!token) {
          if (isMounted) {
            setIsAuthenticated(false);
            setLoading(false);
            navigate('/'); // Redirect to login if no token
          }
          return;
        }
        
        const response = await authAPI.verifyToken();
        if (response.success && isMounted) {
          setIsAuthenticated(true);
          setUserData(response.user);
          
          // Store role in localStorage
          localStorage.setItem('role', response.user.role);
          
          // Check current path and redirect if needed
          const currentPath = window.location.pathname;
          
          if (response.user.role === 'admin') {
            // Admin should be on admin routes
            if (currentPath === '/userdashboard') {
              navigate('/dashboard');
            }
          } else {
            // Non-admin users should be redirected to user dashboard
            if (currentPath !== '/userdashboard') {
              navigate('/userdashboard');
            }
          }
        } else if (isMounted) {
          tokenManager.removeToken();
          localStorage.removeItem('role');
          setIsAuthenticated(false);
          navigate('/'); // Redirect to login on failure
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (isMounted) {
          tokenManager.removeToken();
          localStorage.removeItem('role');
          setIsAuthenticated(false);
          navigate('/'); // Redirect to login on error
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Handle logout
  const handleLogout = () => {
    tokenManager.removeToken();
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    setUserData(null);
    navigate('/');
  };

  // Auto-refresh every 60 seconds - only when authenticated as admin
  useEffect(() => {
    if (!shouldLoadDashboardData) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [shouldLoadDashboardData]);

  // Function to clear dashboard cache
  const clearDashboardCache = () => {
    try {
      localStorage.removeItem('dashboardCache');
      console.log('Dashboard cache cleared');
    } catch (e) {
      console.warn('Failed to clear dashboard cache:', e);
    }
  };

  // If loading initial auth check
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  // If NOT authenticated, show login page with tabs
  if (!isAuthenticated) {
    console.log("User is not logged in");
    return null; // Will redirect via useEffect
  }

  // If authenticated but user is not admin, don't show admin dashboard
  if (userData?.role !== 'admin') {
    // This shouldn't happen because useEffect redirects non-admin users
    return null;
  }

  // ADMIN DASHBOARD VIEW
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">OnTrack Connect</h1>
        <h2 className="dashboard-subtitle">Admin Dashboard</h2>
        <div className="header-actions">
          <span className="user-info">Welcome, {userData?.name || 'Admin'}</span>
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            Logout
          </button>
          <button
            className="clear-cache-btn"
            onClick={() => {
              clearDashboardCache();
              window.location.reload();
            }}
            title="Clear cached data and refresh"
          >
            🔄 Clear Cache
          </button>
        </div>
      </header>

      {/* Loading Overlay */}
      {dashboardLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">Loading dashboard data...</p>
        </div>
      )}

      <div className="dashboard-content">
        {/* SECTION 1: KEY METRICS */}
        <div className="metrics-section">
          <div className="section-header">
            <h3>Key Metrics</h3>
            <div className="section-actions">
              <span className="auto-refresh-info">Auto-refreshes every 60 seconds</span>
            </div>
          </div>
          
          <div className="metrics-grid">
            <div className="metric-card primary">
              <div className="metric-icon">👥</div>
              <div className="metric-content">
                <div className="metric-title">Total Students</div>
                <div className="metric-value">
                  {dashboardLoading ? '...' : totalStudents.toLocaleString()}
                </div>
                <div className="metric-subtitle">All Programs</div>
              </div>
            </div>

            <div className="metric-card success">
              <div className="metric-icon">👨‍🏫</div>
              <div className="metric-content">
                <div className="metric-title">Total Mentors</div>
                <div className="metric-value">
                  {dashboardLoading ? '...' : totalMentors.toLocaleString()}
                </div>
                <div className="metric-subtitle">Active Mentors</div>
              </div>
            </div>

            <div className="metric-card info">
              <div className="metric-icon">📝</div>
              <div className="metric-content">
                <div className="metric-title">Total Assessments</div>
                <div className="metric-value">
                  {dashboardLoading ? '...' : totalAssessments}
                </div>
                <div className="metric-subtitle">Completed</div>
              </div>
            </div>

            <div className="metric-card secondary">
              <div className="metric-icon">👨‍👩‍👧‍👦</div>
              <div className="metric-content">
                <div className="metric-title">Total Cohorts</div>
                <div className="metric-value">
                  {dashboardLoading ? '...' : totalCohorts}
                </div>
                <div className="metric-subtitle">Active Groups</div>
              </div>
            </div>

            {/* Assessment Totals by Program */}
            {Object.keys(assessmentTotalsByProgram).length > 0 && programs.map((program) => (
              <div className="metric-card warning" key={program.key}>
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <div className="metric-title">{program.name} Assessments</div>
                  <div className="metric-value">
                    {dashboardLoading ? '...' : assessmentTotalsByProgram[program.key] || 0}
                  </div>
                  <div className="metric-subtitle">Completed</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 1.5: PLATFORM ENGAGEMENT */}
        <div className="engagement-charts-section">
          <div className="section-header">
            <h3>Platform Engagement</h3>
          </div>
          <div className="charts-grid">
            {/* Bar Chart for Student Distribution by Program */}
            <div className="chart-card">
              <div className="chart-header">
                <h4>Student Distribution by Program</h4>
              </div>
              <div className="chart-container">
                <Bar
                  data={{
                    labels: Object.keys(programTotals),
                    datasets: [{
                      label: 'Students',
                      data: Object.values(programTotals),
                      backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0'
                      ],
                      borderColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0'
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false }
                    },
                    scales: {
                      y: { beginAtZero: true }
                    }
                  }}
                />
              </div>
            </div>

            {/* Pie Chart for Total Students per Track */}
            <div className="chart-card">
              <div className="chart-header">
                <h4>Total Students per Track</h4>
              </div>
              <div className="chart-container">
                <Pie
                  data={{
                    labels: Object.keys(trackTotals),
                    datasets: [{
                      data: Object.values(trackTotals),
                      backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                      ]
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: ADDITIONAL DATA */}
        <div className="two-column-section">
          <div className="column">
            <div className="section-card">
              <div className="section-header">
                <h3>Course & Cohort Management</h3>
              </div>
              <div className="actions-grid">
                <a href="/manageinternship" className="action-btn secondary">
                  <span className="action-text">Manage Internship</span>
                </a>
                <a href="/manageskilldevelopment" className="action-btn secondary">
                  <span className="action-text">Manage Skills Dev</span>
                </a>
                <a href="/managementorship" className="action-btn secondary">
                  <span className="action-text">Manage Mentorship</span>
                </a>
                <a href="/managegraduate" className="action-btn secondary">
                  <span className="action-text">Manage Graduate</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: PROGRAM DATA - 2 columns */}
        <div className="two-column-section">
          {/* Left Column: Student Programs */}
          <div className="column">
            <div className="section-card">
              <div className="section-header">
                <h3>Program Enrollment</h3>
              </div>
              <div className="data-grid">
                <div className="data-row total">
                  <span className="data-label">Total Registered Students</span>
                  <span className="data-value">
                    {dashboardLoading ? '...' : totalStudents}
                  </span>
                </div>
                {programs.map((program) => (
                  <div className="data-row" key={program.key}>
                    <span className="data-label">{program.name}</span>
                    <span className="data-value">
                      {dashboardLoading ? '...' : getProgramCount(program.key)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>Mentorship Track Distribution</h3>
                <p className="section-subtitle">Number of students in each track within Mentorship Program</p>
              </div>
              <div className="data-grid">
                {mentorshipTracks.map((track) => (
                  <div className="data-row" key={track.key}>
                    <span className="data-label">{track.name}</span>
                    <span className="data-value">
                      {dashboardLoading ? '...' : mentorshipTracksData[track.key] || 0}
                    </span>
                  </div>
                ))}
              </div>
              <div className="section-total">
                <h4>Total in Mentorship Program:</h4>
                <span className="total-value">
                  {dashboardLoading ? '...' : Object.values(mentorshipTracksData).reduce((sum, val) => sum + val, 0)}
                </span>
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>Mentor Information</h3>
              </div>
              <div className="data-grid">
                <div className="data-row">
                  <span className="data-label">Total Mentors</span>
                  <span className="data-value">{dashboardLoading ? '...' : totalMentors}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Mentors: Web Development</span>
                  <span className="data-value">{dashboardLoading ? '...' : getMentorCount('Web Development')}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Mentors: Java Development</span>
                  <span className="data-value">{dashboardLoading ? '...' : getMentorCount('Java Programming')}</span>
                </div>
                <div className="data-row">
                  <span className="data-label">Mentors: Python Development</span>
                  <span className="data-value">{dashboardLoading ? '...' : getMentorCount('Python Programming')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quick Actions & Additional Data */}
          <div className="column">
            <div className="section-card">
              <div className="section-header">
                <h3>Quick Actions</h3>
              </div>
              <div className="actions-grid">
                <a href="/onboardstudent" className="action-btn">
                  <span className="action-icon">👤</span>
                  <span className="action-text">Onboard Student</span>
                </a>
                <a href="/onboardmentor" className="action-btn">
                  <span className="action-icon">👨‍🏫</span>
                  <span className="action-text">Onboard Mentor</span>
                </a>
                <a href="/studentassignment" className="action-btn">
                  <span className="action-icon">🔗</span>
                  <span className="action-text">Assign Student</span>
                </a>
                <a href="/assignmentor" className="action-btn">
                  <span className="action-icon">🤝</span>
                  <span className="action-text">Assign Mentor</span>
                </a>
                <a href="/resources" className="action-btn">
                  <span className="action-icon">📚</span>
                  <span className="action-text">Resource Center</span>
                </a>
                <a href="/announcements" className="action-btn">
                  <span className="action-icon">📣</span>
                  <span className="action-text">Announcements</span>
                </a>
                <a href="/events" className="action-btn">
                  <span className="action-icon">📅</span>
                  <span className="action-text">Events</span>
                </a>
                <a href="/help-requests" className="action-btn">
                  <span className="action-icon">🆘</span>
                  <span className="action-text">Help Requests</span>
                </a>
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>Internship Track Distribution</h3>
              </div>
              <div className="data-grid">
                {internshipTracks.map((track) => (
                  <div className="data-row" key={track.key}>
                    <span className="data-label">{track.name}</span>
                    <span className="data-value">
                      {dashboardLoading ? '...' : internshipTracksData[track.key] || 0}
                    </span>
                  </div>
                ))}
              </div>
              <div className="section-total">
                <h4>Total in Internship Program:</h4>
                <span className="total-value">
                  {dashboardLoading ? '...' : Object.values(internshipTracksData).reduce((sum, val) => sum + val, 0)}
                </span>
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3>Skill Development Program</h3>
              </div>
              <div className="data-grid">
                <div className="data-row total">
                  <span className="data-label">Total Students</span>
                  <span className="data-value">
                    {dashboardLoading ? '...' : skillsDevTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
