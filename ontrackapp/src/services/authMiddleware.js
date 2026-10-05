// ======================
// REFACTORED: ontrackapp/src/services/authMiddleware.js
// ======================

/* =========================
   TOKEN MANAGER
========================= */

export const tokenManager = {
  getToken: () => {
    try {
      return localStorage.getItem("authToken");
    } catch {
      return null;
    }
  },

  setToken: (token) => {
    try {
      localStorage.setItem("authToken", token);
    } catch {}
  },

  removeToken: () => {
    try {
      localStorage.removeItem("authToken");
    } catch {}
  },

  getStoredUser: () => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setStoredUser: (user) => {
    try {
      localStorage.setItem("user", JSON.stringify(user));
    } catch {}
  },

  removeStoredUser: () => {
    try {
      localStorage.removeItem("user");
    } catch {}
  },

  clearAuth: () => {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    } catch {}
  },

  isAuthenticated: () => {
    try {
      return !!(
        localStorage.getItem("authToken") &&
        localStorage.getItem("user")
      );
    } catch {
      return false;
    }
  }
};

/* =========================
   AUTH API - All API calls in one place
   Note: Using relative URLs - these will be proxied in dev
========================= */

const authFetch = async (endpoint, options = {}) => {
  const token = tokenManager.getToken();
  if (!token) throw new Error("No authentication token");

  const response = await fetch(`${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 403 && data.accessDenied) {
      tokenManager.clearAuth();
    }
    throw new Error(data.message || "Request failed");
  }

  return data;
};

export const authAPI = {
  /* ---------- STUDENT AUTH ---------- */
  
  // Student login - calls /api/onboardstudents/login
  login: async (username, password) => {
    tokenManager.clearAuth();

    const payload = { username, password };

    const response = await fetch(
      `/api/onboardstudents/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    if (data.token) {
      tokenManager.setToken(data.token);
      tokenManager.setStoredUser(data.user);
    }

    return data;
  },

  /* ---------- ADMIN AUTH ---------- */
  
  // Admin login - calls /api/auth/admin-login
  // NOTE: The route is mounted at /api/auth, not /api/adminlogin
  adminLogin: async (username, password) => {
    tokenManager.clearAuth();

    const payload = { username, password };

    const response = await fetch(
      `/api/auth/admin-login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Admin login failed");
    }

    if (data.token) {
      tokenManager.setToken(data.token);
      tokenManager.setStoredUser(data.user);
    }

    return data;
  },

  /* ---------- TOKEN VERIFICATION ---------- */
  
  // Verify token - calls /api/auth/verify
  // This is the correct endpoint (auth.js has /verify route)
  verifyToken: async () => {
    const token = tokenManager.getToken();
    if (!token) return { success: false, message: 'No token' };

    try {
      const resp = await fetch(`/api/auth/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(5000)
      });

      if (!resp.ok) {
        tokenManager.clearAuth();
        return { success: false, message: 'Token invalid' };
      }

      const data = await resp.json();
      return data;
    } catch (err) {
      tokenManager.clearAuth();
      return { success: false, message: 'Token verification failed' };
    }
  },

  /* ---------- USER PROFILE ---------- */
  
  getProfile: () => authFetch("/api/onboardstudents/profile"),

  logout: () => {
    tokenManager.clearAuth();
  },

  /* ---------- USER CONTENT ---------- */

  getUserTasks: () => authFetch("/api/assessments/tasks"),

  getUserModules: () => authFetch("/api/assessments/modules"),

  getUserAssignments: () => authFetch("/api/assessments/assignments"),

  getUserProjects: () => authFetch("/api/assessments/projects"),

  getUserResources: () => authFetch("/api/assessments/resources"),

  getUserAssessments: () => authFetch("/api/assessments"),

  /* ---------- MENTOR ---------- */

  getStudentMentor: () => authFetch("/api/mentorstudentassignment/student"),

  getAllMentors: async () => {
    const response = await fetch("/api/onboardmentors");

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch mentors");
    }

    return data;
  },

  /* ---------- HELP REQUESTS ---------- */

  getHelpRequests: () => authFetch("/api/help-requests"),

  createHelpRequest: (helpRequestData) =>
    authFetch("/api/help-requests", {
      method: "POST",
      body: JSON.stringify(helpRequestData)
    })
};
