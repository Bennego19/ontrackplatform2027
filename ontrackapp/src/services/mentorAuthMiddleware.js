// src/services/mentorAuthMiddleware.js

import { tokenManager } from './authMiddleware';
import { readApiJson } from './readApiJson';

const API_BASE_URL = "";

// Mentor authentication API
export const mentorAuthAPI = {
  // Mentor login
  login: async (username, password) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/onboardmentors/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ username, password })
        }
      );

      const data = await readApiJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Mentor login failed");
      }

      return { ...data, user: data.mentor };
    } catch (error) {
      console.error("Mentor login error:", error);
      throw error;
    }
  },

  // Get mentor profile
  getProfile: async () => {
    try {
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/mentordashboard/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await readApiJson(response);

      if (!response.ok) {
        if (response.status === 403 && data.accessDenied) {
          tokenManager.clearAuth();
          throw new Error("Access denied. You have been logged out.");
        }
        throw new Error(data.message || "Failed to fetch mentor profile");
      }

      return data;
    } catch (error) {
      console.error("Mentor profile fetch error:", error);
      throw error;
    }
  },

  // Get students assigned to mentor
  getAssignedStudents: async () => {
    try {
      const token = tokenManager.getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/mentordashboard/assigned-students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await readApiJson(response);

      if (!response.ok) {
        if (response.status === 403 && data.accessDenied) {
          tokenManager.clearAuth();
          throw new Error("Access denied. You have been logged out.");
        }
        throw new Error(data.message || "Failed to fetch assigned students");
      }

      return data;
    } catch (error) {
      console.error("Fetch assigned students error:", error);
      throw error;
    }
  },

  getTasks: () => mentorAuthFetch('/api/mentordashboard/tasks'),
  getAssignments: () => mentorAuthFetch('/api/mentordashboard/assignments'),
  getProjects: () => mentorAuthFetch('/api/mentordashboard/projects'),
  getResources: () => mentorAuthFetch('/api/mentordashboard/resources'),
  updateProfile: data => mentorAuthFetch('/api/mentordashboard/profile', 'PUT', data),
  createTask: data => mentorAuthFetch('/api/mentordashboard/tasks', 'POST', data),
  updateTask: (id, data) => mentorAuthFetch(`/api/mentordashboard/tasks/${id}`, 'PUT', data),
  deleteTask: id => mentorAuthFetch(`/api/mentordashboard/tasks/${id}`, 'DELETE'),
  createAssignment: data => mentorAuthFetch('/api/mentordashboard/assignments', 'POST', data),
  updateAssignment: (id, data) => mentorAuthFetch(`/api/mentordashboard/assignments/${id}`, 'PUT', data),
  deleteAssignment: id => mentorAuthFetch(`/api/mentordashboard/assignments/${id}`, 'DELETE'),
  createProject: data => mentorAuthFetch('/api/mentordashboard/projects', 'POST', data),
  updateProject: (id, data) => mentorAuthFetch(`/api/mentordashboard/projects/${id}`, 'PUT', data),
  deleteProject: id => mentorAuthFetch(`/api/mentordashboard/projects/${id}`, 'DELETE'),
  uploadResource: data => mentorAuthFetch('/api/mentordashboard/resources', 'POST', data),
  deleteResource: id => mentorAuthFetch(`/api/mentordashboard/resources/${id}`, 'DELETE'),

  // Mentor logout
  logout: () => {
    tokenManager.clearAuth();
    mentorTokenManager.clearAuth();
  }
};

async function mentorAuthFetch(path, method = 'GET', data) {
  const token = tokenManager.getToken();
  if (!token) throw new Error('No authentication token found');
  const isForm = data instanceof FormData;
  const response = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(data !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}) },
    ...(data !== undefined ? { body: isForm ? data : JSON.stringify(data) } : {})
  });
  if (!response.ok) throw new Error('Unable to load mentor dashboard data');
  return readApiJson(response);
}

// Mentor token manager (separate from student auth)
export const mentorTokenManager = {
  getToken: () => {
    try {
      return localStorage.getItem("mentorAuthToken");
    } catch {
      return null;
    }
  },

  setToken: (token) => {
    try {
      localStorage.setItem("mentorAuthToken", token);
    } catch {}
  },

  removeToken: () => {
    try {
      localStorage.removeItem("mentorAuthToken");
    } catch {}
  },

  getStoredMentor: () => {
    try {
      const mentor = localStorage.getItem("mentor");
      return mentor ? JSON.parse(mentor) : null;
    } catch {
      return null;
    }
  },

  setStoredMentor: (mentor) => {
    try {
      localStorage.setItem("mentor", JSON.stringify(mentor));
    } catch {}
  },

  removeStoredMentor: () => {
    try {
      localStorage.removeItem("mentor");
    } catch {}
  },

  isAuthenticated: () => {
    try {
      return !!(
        localStorage.getItem("mentorAuthToken") &&
        localStorage.getItem("mentor")
      );
    } catch {
      return false;
    }
  },

  clearAuth: () => {
    try {
      localStorage.removeItem("mentorAuthToken");
      localStorage.removeItem("mentor");
    } catch {}
  }
};
