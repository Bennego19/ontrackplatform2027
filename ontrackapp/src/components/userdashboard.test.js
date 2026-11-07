import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import axios from 'axios';
import UserDashboard from './userdashboard';
import { authAPI, tokenManager } from '../services/authMiddleware';

// Mock dependencies
vi.mock('axios');
vi.mock('../services/authMiddleware');
vi.mock('./DocumentViewer', () => ({ default: ({ url, onClose }) => (
  <div data-testid="document-viewer">
    <p>Viewing: {url}</p>
    <button onClick={onClose}>Close</button>
  </div>
) }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock window methods
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  configurable: true,
  value: vi.fn(),
});

const mockUserData = {
  name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  program: 'Skills Development Program',
  track: 'Web Development',
  semester: 'March 2024',
  registrationMonth: 'March',
  studentId: 'johndoe',
  cohort: 'Skills Development Program 2024',
  startDate: '2024-03-01',
  cellnumber: '1234567890'
};

const mockAssignments = [
  {
    _id: '1',
    assessmentname: 'HTML Basics Assignment',
    description: 'Create a basic HTML page',
    createdAt: '2024-01-01',
    datedue: '2024-01-15',
    documentLink: '/documents/assignment1.pdf'
  }
];

const mockAssessments = [
  {
    _id: '2',
    assessmentname: 'JavaScript Fundamentals Test',
    description: 'Test your JS knowledge',
    createdAt: '2024-01-05',
    datedue: '2024-01-20',
    documentLink: '/documents/assessment1.pdf'
  }
];

const mockTasks = [
  {
    _id: '3',
    assessmentname: 'Code Review Task',
    description: 'Review peer code',
    createdAt: '2024-01-10',
    datedue: '2024-01-25'
  }
];

const mockProjects = [
  {
    _id: '4',
    assessmentname: 'Portfolio Website',
    description: 'Build a personal portfolio',
    createdAt: '2024-01-15',
    datedue: '2024-02-15',
    documentLink: '/documents/project1.pdf'
  }
];

const mockModules = [
  {
    _id: '5',
    assessmentname: 'Introduction to HTML',
    description: 'Learn HTML basics',
    createdAt: '2024-01-01',
    datedue: '2024-01-10',
    documentLink: '/documents/module1.pdf'
  }
];

const mockResources = [
  {
    _id: '6',
    assessmentname: 'CSS Guide',
    description: 'Complete CSS reference',
    createdAt: '2024-01-05',
    program: 'Skills Development Program',
    track: 'Web Development',
    websiteLink: 'https://example.test/guide',
    documentLink: '/documents/resource1.pdf'
  }
];

const mockNotices = [
  {
    id: '1',
    title: 'Important Announcement',
    message: 'System maintenance scheduled for tomorrow',
    postedAt: '2024-01-10T10:00:00Z'
  }
];

const mockHelpRequests = [
  {
    _id: '1',
    title: 'Login Issue',
    description: 'Cannot access dashboard',
    category: 'Technical',
    status: 'Pending',
    createdAt: '2024-01-10T09:00:00Z'
  }
];

describe('UserDashboard Component - Thorough Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock token manager
    tokenManager.getToken.mockReturnValue('mock-token');
    tokenManager.getStoredUser.mockReturnValue(mockUserData);
    tokenManager.setToken.mockImplementation(() => {});
    tokenManager.setStoredUser.mockImplementation(() => {});
    tokenManager.removeToken.mockImplementation(() => {});
    tokenManager.removeStoredUser.mockImplementation(() => {});

    // Mock auth API
    authAPI.getProfile.mockResolvedValue(mockUserData);
    authAPI.getUserAssignments.mockResolvedValue(mockAssignments);
    authAPI.getUserAssessments.mockResolvedValue(mockAssessments);
    authAPI.getUserTasks.mockResolvedValue(mockTasks);
    authAPI.getUserProjects.mockResolvedValue(mockProjects);
    authAPI.getUserModules.mockResolvedValue(mockModules);
    authAPI.getUserResources.mockResolvedValue(mockResources);
    authAPI.getHelpRequests.mockResolvedValue(mockHelpRequests);
    authAPI.getStudentMentor.mockResolvedValue({
      assignments: [{ mentor: { name: 'Jane Smith', email: 'jane@example.com' } }]
    });

    // Mock axios for notices
    axios.get.mockResolvedValue({ data: mockNotices });
  });

  describe('Authentication and Initial Load', () => {
    test('renders login form when not authenticated', () => {
      tokenManager.getToken.mockReturnValue(null);
      tokenManager.getStoredUser.mockReturnValue(null);

      render(<UserDashboard />);

      expect(screen.getByText('Academic Portal Login')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    test('renders dashboard when authenticated', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
      });
    });

    test('loads all data on authentication', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        expect(authAPI.getProfile).toHaveBeenCalled();
        expect(authAPI.getUserAssignments).toHaveBeenCalled();
        expect(authAPI.getUserAssessments).toHaveBeenCalled();
        expect(authAPI.getUserTasks).toHaveBeenCalled();
        expect(authAPI.getUserProjects).toHaveBeenCalled();
        expect(authAPI.getUserModules).toHaveBeenCalled();
        expect(authAPI.getUserResources).toHaveBeenCalled();
        expect(authAPI.getHelpRequests).toHaveBeenCalled();
        expect(axios.get).toHaveBeenCalledWith('/api/announcements', { headers: { Authorization: 'Bearer mock-token' } });
      });
    });
  });

  describe('Dashboard Tab Rendering', () => {
    test('renders dashboard tab with user info', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
        expect(screen.getByText('Academic Program')).toBeInTheDocument();
        expect(screen.getByText('Skills Development Program')).toBeInTheDocument();
      });
    });

    test('renders courses tab with program descriptions', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Course Outline'));
      });

      expect(screen.getByText('Academic Courses')).toBeInTheDocument();
      expect(screen.getByText('About Your Program: Skills Development Program - Web Development')).toBeInTheDocument();
    });

    test('shows the description for the programme name used during onboarding', async () => {
      authAPI.getProfile.mockResolvedValue({ ...mockUserData, program: 'Skill Development Program' });
      render(<UserDashboard />);
      await screen.findByText('Skill Development Program');
      fireEvent.click(screen.getByText('Course Outline'));
      expect(screen.getByText(/equips learners with job-ready tech and entrepreneurial skills/)).toBeInTheDocument();
    });

    test('renders modules tab with module list', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Modules'));
      });

      expect(screen.getByRole('heading', { name: 'Modules' })).toBeInTheDocument();
      expect(screen.getByText('Module List (1)')).toBeInTheDocument();
      expect(screen.getByText('Introduction to HTML')).toBeInTheDocument();
    });

    test('renders resources tab with resource list', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Resources'));
      });

      expect(screen.getByText('Learning Resources')).toBeInTheDocument();
      expect(screen.getByText('Resources (1)')).toBeInTheDocument();
      expect(screen.getByText('CSS Guide')).toBeInTheDocument();
      fireEvent.click(screen.getByText('CSS Guide'));
      expect(screen.getByRole('link', { name: 'Open website' })).toHaveAttribute('href', 'https://example.test/guide');
    });

    test('does not render unsafe resource links', async () => {
      authAPI.getUserResources.mockResolvedValue([{ ...mockResources[0], websiteLink: 'javascript:alert(1)' }]);
      render(<UserDashboard />);
      await waitFor(() => fireEvent.click(screen.getByText('Resources')));
      fireEvent.click(await screen.findByText('CSS Guide'));
      expect(screen.queryByRole('link', { name: 'Open website' })).not.toBeInTheDocument();
    });

    test('renders assignments tab with assignment list', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Assignments'));
      });

      expect(screen.getByText('Academic Assignments')).toBeInTheDocument();
      expect(screen.getByText('Assignment List (1)')).toBeInTheDocument();
      expect(screen.getByText('HTML Basics Assignment')).toBeInTheDocument();
    });

    test('renders assessments tab with assessment list', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Assessments'));
      });

      expect(screen.getByText('Academic Assessments')).toBeInTheDocument();
      expect(screen.getByText('Assessment List (1)')).toBeInTheDocument();
      expect(screen.getByText('JavaScript Fundamentals Test')).toBeInTheDocument();
    });

    test('renders tasks tab with task list', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Tasks'));
      });

      expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
      expect(screen.getByText('Task List (1)')).toBeInTheDocument();
      expect(screen.getByText('Code Review Task')).toBeInTheDocument();
    });

    test('renders projects tab with project list', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Projects'));
      });

      expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
      expect(screen.getByText('Project List (1)')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Website')).toBeInTheDocument();
    });

    test('renders help requests tab with form and list', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Help Requests'));
      });

      expect(screen.getByRole('heading', { name: 'Help Requests' })).toBeInTheDocument();
      expect(screen.getByText('Submit a New Help Request')).toBeInTheDocument();
      expect(screen.getByText('Your Help Requests')).toBeInTheDocument();
      expect(screen.getByText('Login Issue')).toBeInTheDocument();
    });

    test('renders notices tab with announcements', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Notices'));
      });

      expect(screen.getByText('Important Announcement')).toBeInTheDocument();
      expect(screen.getByText('System maintenance scheduled for tomorrow')).toBeInTheDocument();
    });

    test('renders profile tab with user details', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Profile'));
      });

      expect(screen.getByText('Student Profile')).toBeInTheDocument();
      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });
  });

  describe('Document Viewer Functionality', () => {
    test('opens document modal when document link is clicked', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Modules'));
      });

      const viewButton = screen.getByText('View Document');
      fireEvent.click(viewButton);

      expect(screen.getByTestId('document-viewer')).toBeInTheDocument();
      expect(screen.getByText('Viewing: /documents/module1.pdf')).toBeInTheDocument();
    });

    test('closes document modal', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Modules'));
      });

      fireEvent.click(screen.getByText('View Document'));
      fireEvent.click(screen.getByText('Close'));

      expect(screen.queryByTestId('document-viewer')).not.toBeInTheDocument();
    });
  });

  describe('Help Request Submission', () => {
    test('submits help request successfully', async () => {
      authAPI.createHelpRequest.mockResolvedValue({ success: true });

      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Help Requests'));
      });

      fireEvent.change(screen.getByPlaceholderText('Brief title for your request'), {
        target: { value: 'Test Request' }
      });
      fireEvent.change(screen.getByPlaceholderText('Detailed description of your request'), {
        target: { value: 'Test description' }
      });

      fireEvent.click(screen.getByText('Submit Request'));

      await waitFor(() => {
        expect(authAPI.createHelpRequest).toHaveBeenCalledWith({
          topic: 'Test Request',
          description: 'Test description',
          area: 'Technical'
        });
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    test('shows mobile menu button on small screens', () => {
      window.innerWidth = 600;

      render(<UserDashboard />);

      expect(screen.getByText('☰')).toBeInTheDocument();
    });

    test('toggles mobile sidebar', async () => {
      window.innerWidth = 600;

      render(<UserDashboard />);

      const menuButton = screen.getByText('☰');
      fireEvent.click(menuButton);

      // Sidebar should be open
      expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      authAPI.getUserAssignments.mockRejectedValue(new Error('API Error'));

      render(<UserDashboard />);

      await waitFor(() => {
        // Should still render dashboard despite API error
        expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
      });
    });

    test('shows login error message', async () => {
      tokenManager.getToken.mockReturnValue(null);
      tokenManager.getStoredUser.mockReturnValue(null);
      authAPI.login.mockRejectedValue(new Error('Invalid credentials'));

      render(<UserDashboard />);

      fireEvent.change(screen.getByPlaceholderText('Enter your username'), {
        target: { value: 'wronguser' }
      });
      fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
        target: { value: 'wrongpass' }
      });

      fireEvent.click(screen.getByText('Access Dashboard'));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Tab Switching', () => {
    test('distinguishes tasks that share a title', async () => {
      authAPI.getUserTasks.mockResolvedValue([
        { _id: 'task-a', assessmentname: 'Shared title', description: 'First task details' },
        { _id: 'task-b', assessmentname: 'Shared title', description: 'Second task details' }
      ]);
      render(<UserDashboard />);
      await screen.findByText('Welcome back, John!');
      fireEvent.click(screen.getByText('Tasks'));
      const titles = await screen.findAllByText('Shared title');
      fireEvent.click(titles[0]);
      expect(screen.getByText('First task details')).toBeInTheDocument();
      expect(titles[0].parentElement).toHaveStyle({ backgroundColor: '#ebf8ff' });
      expect(titles[1].parentElement).toHaveStyle({ backgroundColor: '#ffffff' });
      fireEvent.click(titles[1]);
      expect(screen.getByText('Second task details')).toBeInTheDocument();
      expect(titles[0].parentElement).toHaveStyle({ backgroundColor: '#ffffff' });
      expect(titles[1].parentElement).toHaveStyle({ backgroundColor: '#ebf8ff' });
    });

    test('switches between tabs correctly', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Assignments'));
      expect(screen.getByText('Academic Assignments')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Assessments'));
      expect(screen.getByText('Academic Assessments')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Tasks'));
      expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    });

    test('highlights active tab', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        const dashboardTab = screen.getByText('Dashboard');
        expect(dashboardTab.closest('button')).toHaveAttribute('aria-current', 'page');
      });
    });
  });

  describe('Data Refresh and Auto-update', () => {
    test('refreshes data every 30 seconds when authenticated', async () => {
      vi.useFakeTimers();

      render(<UserDashboard />);

      try {
        await act(async () => {});
        expect(authAPI.getUserAssignments).toHaveBeenCalledTimes(1);
        await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
        expect(authAPI.getUserAssignments).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Logout Functionality', () => {
    test('logs out user correctly', async () => {
      render(<UserDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Sign Out'));

      expect(tokenManager.removeToken).toHaveBeenCalled();
      expect(tokenManager.removeStoredUser).toHaveBeenCalled();
      // Should redirect to signin, but navigation is mocked
    });
  });

  describe('Empty States', () => {
    test('shows empty state when no assignments', async () => {
      authAPI.getUserAssignments.mockResolvedValue([]);

      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Assignments'));
      });

      expect(screen.getByText('No Assignments Available')).toBeInTheDocument();
    });

    test('shows empty state when no assessments', async () => {
      authAPI.getUserAssessments.mockResolvedValue([]);

      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Assessments'));
      });

      expect(screen.getByText('No Assessments Available')).toBeInTheDocument();
    });

    test('shows empty state when no tasks', async () => {
      authAPI.getUserTasks.mockResolvedValue([]);

      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Tasks'));
      });

      expect(screen.getByText('No Tasks Available')).toBeInTheDocument();
    });

    test('shows empty state when no projects', async () => {
      authAPI.getUserProjects.mockResolvedValue([]);

      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Projects'));
      });

      expect(screen.getByText('No Projects Available')).toBeInTheDocument();
    });

    test('shows empty state when no modules', async () => {
      authAPI.getUserModules.mockResolvedValue([]);

      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Modules'));
      });

      expect(screen.getByText('No Modules Available')).toBeInTheDocument();
    });

    test('shows empty state when no resources', async () => {
      authAPI.getUserResources.mockResolvedValue([]);

      render(<UserDashboard />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Resources'));
      });

      expect(screen.getByText('No Resources Available')).toBeInTheDocument();
    });
  });

});
