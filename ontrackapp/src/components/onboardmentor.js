import React, { useState, useEffect } from "react";
import axios from "axios";

import { tokenManager } from "../services/authMiddleware";
import "./OnboardMentor.css";

export default function ManageMentors() {
  const [activeTab, setActiveTab] = useState("create");
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    cellnumber: "",
    username: "",
    password: ""
  });

  const [mentors, setMentors] = useState([]);
  const [updateFormData, setUpdateFormData] = useState({});
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRead, setLoadingRead] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [resetLink, setResetLink] = useState('');


  // Helper: extract field-specific errors
  function getFieldError(fieldName) {
    const err = errors.find(e => e.field === fieldName);
    return err ? err.message : "";
  }

  // Handle form updates
  function updateForm(value) {
    setFormData(prev => ({ ...prev, ...value }));
    if (errors.length > 0) setErrors([]);
    if (successMessage) setSuccessMessage("");
  }

  function handleInputChange(field, value) {
    updateForm({ [field]: value });
  }

  const showMessage = (text, type = "success") => {
    if (type === "success") {
      setSuccessMessage(text);
      setTimeout(() => setSuccessMessage(""), 4000);
    } else {
      setErrors([{ field: "general", message: text }]);
      setTimeout(() => setErrors([]), 4000);
    }
  };

  // CREATE MENTOR
  const validateForm = () => {
    const newErrors = [];

    if (!formData.name.trim()) newErrors.push({ field: "name", message: "Name is required" });
    if (!formData.surname.trim()) newErrors.push({ field: "surname", message: "Surname is required" });

    if (!formData.email.trim()) {
      newErrors.push({ field: "email", message: "Email is required" });
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.push({ field: "email", message: "Email is invalid" });
    }

    if (!formData.cellnumber.trim()) {
      newErrors.push({ field: "cellnumber", message: "Cell number is required" });
    } else if (!/^\+?[\d\s-()]+$/.test(formData.cellnumber)) {
      newErrors.push({ field: "cellnumber", message: "Cell number is invalid" });
    }

    if (!formData.username.trim()) newErrors.push({ field: "username", message: "Username is required" });
    if (!formData.password.trim()) {
      newErrors.push({ field: "password", message: "Password is required" });
    } else if (formData.password.length < 12) {
      newErrors.push({ field: "password", message: "Password must be at least 12 characters" });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const isCreateFormValid =
    formData.name &&
    formData.surname &&
    formData.email &&
    formData.cellnumber &&
    formData.username &&
    formData.password;

  async function handleCreateSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      showMessage("Please fix the errors in the form.", "error");
      return;
    }

    setLoading(true);
    setErrors([]);
    setSuccessMessage("");

    try {
      await axios.post("/api/onboardmentors/onboardmentor", formData, {
        headers: { Authorization: `Bearer ${tokenManager.getToken()}` }
      });

      showMessage(`✅ Mentor "${formData.name} ${formData.surname}" onboarded successfully!`);
      
      // Reset form
      setFormData({
        name: "",
        surname: "",
        email: "",
        cellnumber: "",
        username: "",
        password: ""
      });

      // Refresh mentors list
      loadMentors();
      
    } catch (error) {
      console.error("Onboarding error:", error);
      if (error.response?.data?.error?.includes("email")) {
        showMessage("❌ A mentor with this email already exists.", "error");
      } else if (error.response?.data?.error?.includes("username")) {
        showMessage("❌ Username is already taken.", "error");
      } else {
        showMessage("❌ Failed to onboard mentor. Please try again.", "error");
      }
    }

    setLoading(false);
  }

  // READ MENTORS
  const loadMentors = async () => {
    setLoadingRead(true);
    try {
      const response = await axios.get("/api/onboardmentors", {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      setMentors(response.data);
    } catch (error) {
      console.error('Error loading mentors:', error);
      showMessage("Failed to load mentors.", "error");
    } finally {
      setLoadingRead(false);
    }
  };

  const createResetLink = async id => {
    setResetLink('');
    try {
      const response = await fetch(`/api/password-reset/issue/mentor/${id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${tokenManager.getToken()}` }, cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to create reset link');
      setResetLink(`${window.location.origin}/reset-password#${data.token}`);
    } catch (error) { showMessage(error.message || 'Unable to create reset link', 'error'); }
  };

  // UPDATE MENTORS
  const loadMentorsForUpdate = async () => {
    setLoadingUpdate(true);
    try {
      const response = await axios.get("/api/onboardmentors", {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      setMentors(response.data);

      // Initialize updateFormData with current mentor values
      const initialUpdateData = {};
      response.data.forEach(mentor => {
        initialUpdateData[mentor._id || mentor.id] = {
          name: mentor.name || '',
          surname: mentor.surname || '',
          email: mentor.email || '',
          cellnumber: mentor.cellnumber || '',
          username: mentor.username || '',
          password: ''
        };
      });
      setUpdateFormData(initialUpdateData);
    } catch (error) {
      console.error('Error loading mentors for update:', error);
      showMessage("Failed to load mentors for update.", "error");
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleUpdateChange = (id, field, value) => {
    setUpdateFormData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const updateMentor = async (id) => {
    try {
      const mentorData = updateFormData[id] || {};
      await axios.patch(`/api/onboardmentors/${id}`, mentorData, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      showMessage(`✅ Mentor ${id} updated successfully!`);
      loadMentors();
      loadMentorsForUpdate();
    } catch (error) {
      console.error('Error updating mentor:', error);
      showMessage("Error updating mentor.", "error");
    }
  };

  const cancelEdit = (id) => {
    showMessage(`❌ Edit for Mentor ${id} cancelled`);
    loadMentorsForUpdate();
  };

  // Keep mentor accounts and their materials when access is removed.
  const setMentorAccess = async (mentor, active) => {
    const id = mentor._id || mentor.id;
    try {
      await axios.patch(`/api/onboardmentors/${id}/access`, { active }, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      showMessage(`Mentor ${active ? 'activated' : 'deactivated'} successfully`);
      setMentors(prev => prev.map(item => (item._id || item.id) === id ? { ...item, isActive: active, accessAllowed: active ? 'granted' : 'denied' } : item));
    } catch (error) {
      console.error('Error updating mentor access:', error);
      if (error.response?.status === 404) {
        showMessage("Mentor not found.", "error");
      } else {
        showMessage("Error updating mentor access.", "error");
      }
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors([]);
    setSuccessMessage("");
    if (tab === "read") loadMentors();
    if (tab === "update") loadMentorsForUpdate();
    if (tab === "delete") loadMentors();
  };

  // Filter mentors for search
  const filteredMentors = mentors.filter(mentor =>
    mentor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadMentors();
    // Load once on mount; tab actions explicitly refresh the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="manage-mentors-container">
      <div className="manage-mentors-card">
        <div className="manage-mentors-header">
          <div className="header-icon">👨‍🏫</div>
          <h1 className="manage-mentors-title">Manage Mentors</h1>
          <p className="manage-mentors-subtitle">Create, view, update and manage mentor access</p>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && <div className="success-message">{successMessage}</div>}
        {resetLink && <div className="success-message"><label>Single-use reset link (expires in 15 minutes)
          <input aria-label="Mentor password reset link" type="text" readOnly value={resetLink} onFocus={event => event.target.select()} />
        </label><p>Share this link securely with the mentor. Creating another link invalidates this one.</p>
          <button type="button" onClick={() => setResetLink('')}>Dismiss</button>
        </div>}

        {/* GENERAL ERRORS */}
        {errors.some(e => e.field === "general") && (
          <div className="error-message general-error">
            {errors
              .filter(e => e.field === "general")
              .map((err, idx) => (
                <div key={idx}>{err.message}</div>
              ))}
          </div>
        )}

        <div className="tab-container-mentors">
          {/* Tabs */}
          <div className="tabs-mentors">
            <button 
              className={`tab-mentors ${activeTab === "create" ? "active" : ""}`}
              onClick={() => handleTabChange("create")}
            >
              Create Mentor
            </button>
            <button 
              className={`tab-mentors ${activeTab === "read" ? "active" : ""}`}
              onClick={() => handleTabChange("read")}
            >
              View Mentors
            </button>
            <button 
              className={`tab-mentors ${activeTab === "update" ? "active" : ""}`}
              onClick={() => handleTabChange("update")}
            >
              Update Mentors
            </button>
            <button 
              className={`tab-mentors ${activeTab === "delete" ? "active" : ""}`}
              onClick={() => handleTabChange("delete")}
            >
              Manage Access
            </button>
          </div>

          <div className="tab-content-mentors">
            {/* CREATE TAB */}
            {activeTab === "create" && (
              <div className="tab-pane-mentors active">
                <div className="form-section">
                  <h3 className="section-title">Create New Mentor</h3>
                  <form onSubmit={handleCreateSubmit} className="mentors-form">
                    {/* PERSONAL INFORMATION */}
                    <div className="form-section">
                      <h4 className="section-subtitle">Personal Information</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">First Name *</label>
                          <input
                            type="text"
                            className={`form-input ${getFieldError("name") ? "error" : ""}`}
                            placeholder="Enter first name"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("name") && (
                            <span className="error-message">{getFieldError("name")}</span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Last Name *</label>
                          <input
                            type="text"
                            className={`form-input ${getFieldError("surname") ? "error" : ""}`}
                            placeholder="Enter last name"
                            value={formData.surname}
                            onChange={(e) => handleInputChange("surname", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("surname") && (
                            <span className="error-message">{getFieldError("surname")}</span>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Email Address *</label>
                          <input
                            type="email"
                            className={`form-input ${getFieldError("email") ? "error" : ""}`}
                            placeholder="mentor@example.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange("email", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("email") && (
                            <span className="error-message">{getFieldError("email")}</span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Cell Number *</label>
                          <input
                            type="tel"
                            className={`form-input ${getFieldError("cellnumber") ? "error" : ""}`}
                            placeholder="+1 (555) 123-4567"
                            value={formData.cellnumber}
                            onChange={(e) => handleInputChange("cellnumber", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("cellnumber") && (
                            <span className="error-message">{getFieldError("cellnumber")}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ACCOUNT INFORMATION */}
                    <div className="form-section">
                      <h4 className="section-subtitle">Account Information</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Username *</label>
                          <input
                            type="text"
                            className={`form-input ${getFieldError("username") ? "error" : ""}`}
                            placeholder="Enter username"
                            value={formData.username}
                            onChange={(e) => handleInputChange("username", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("username") && (
                            <span className="error-message">{getFieldError("username")}</span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Password *</label>
                          <input
                            type="password"
                            minLength={12}
                            className={`form-input ${getFieldError("password") ? "error" : ""}`}
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={(e) => handleInputChange("password", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("password") && (
                            <span className="error-message">{getFieldError("password")}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="action-section">
                      <button
                        type="submit"
                        disabled={!isCreateFormValid || loading}
                        className={`submit-button ${loading ? "loading" : ""}`}
                      >
                        {loading ? "Onboarding Mentor..." : "➕ Create Mentor"}
                      </button>

                      <div className="form-requirements">
                        <span className="requirement-text">* Required fields</span>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* READ TAB */}
            {activeTab === "read" && (
              <div className="tab-pane-mentors active">
                <div className="form-section">
                  <div className="section-header">
                    <h3 className="section-title">View Mentors</h3>
                    <div className="search-refresh-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search mentors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button onClick={loadMentors} className="refresh-button">
                        🔄 Refresh
                      </button>
                    </div>
                  </div>

                  {loadingRead ? (
                    <div className="loading-message">
                      Loading mentors...
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Cell Number</th>
                            <th>Username</th>
                            <th>Access</th>
                            <th>Account recovery</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMentors.map(mentor => (
                            <tr key={mentor._id || mentor.id}>
                              <td>{mentor._id || mentor.id}</td>
                              <td>{mentor.name}</td>
                              <td>{mentor.surname}</td>
                              <td>{mentor.cellnumber}</td>
                              <td>{mentor.username}</td>
                              <td>{mentor.isActive === false || mentor.accessAllowed === 'denied' ? 'Inactive' : 'Active'}</td>
                              <td><button type="button" disabled={mentor.isActive === false || mentor.accessAllowed === 'denied'} onClick={() => createResetLink(mentor._id || mentor.id)} aria-label={`Reset password for ${mentor.username}`}>Create reset link</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredMentors.length === 0 && (
                        <div className="no-data-message">
                          {searchTerm ? "No mentors found matching your search." : "No mentors found."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* UPDATE TAB */}
            {activeTab === "update" && (
              <div className="tab-pane-mentors active">
                <div className="form-section">
                  <h3 className="section-title">Update Mentors</h3>
                  <p className="section-subtitle">Edit mentor details and save changes</p>

                  {loadingUpdate ? (
                    <div className="loading-message">
                      Loading mentors...
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Email</th>
                            <th>Cell Number</th>
                            <th>Username</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mentors.map(mentor => (
                            <tr key={mentor._id || mentor.id}>
                              <td>{mentor._id || mentor.id}</td>
                              <td>
                                <input
                                  type="text"
                                  value={updateFormData[mentor._id || mentor.id]?.name ?? mentor.name}
                                  onChange={(e) => handleUpdateChange(mentor._id || mentor.id, "name", e.target.value)}
                                  className="update-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={updateFormData[mentor._id || mentor.id]?.surname ?? mentor.surname}
                                  onChange={(e) => handleUpdateChange(mentor._id || mentor.id, "surname", e.target.value)}
                                  className="update-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="email"
                                  value={updateFormData[mentor._id || mentor.id]?.email ?? mentor.email}
                                  onChange={(e) => handleUpdateChange(mentor._id || mentor.id, "email", e.target.value)}
                                  className="update-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={updateFormData[mentor._id || mentor.id]?.cellnumber ?? mentor.cellnumber}
                                  onChange={(e) => handleUpdateChange(mentor._id || mentor.id, "cellnumber", e.target.value)}
                                  className="update-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={updateFormData[mentor._id || mentor.id]?.username ?? mentor.username}
                                  onChange={(e) => handleUpdateChange(mentor._id || mentor.id, "username", e.target.value)}
                                  className="update-input"
                                />
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    onClick={() => updateMentor(mentor._id || mentor.id)}
                                    className="update-btn"
                                  >
                                    💾 Save
                                  </button>
                                  <button
                                    onClick={() => cancelEdit(mentor._id || mentor.id)}
                                    className="cancel-btn"
                                  >
                                    ❌ Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {mentors.length === 0 && (
                        <div className="no-data-message">
                          No mentors available for update.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DELETE TAB */}
            {activeTab === "delete" && (
              <div className="tab-pane-mentors active">
                <div className="form-section">
                  <h3 className="section-title">Manage Mentor Access</h3>
                  <p className="section-subtitle">Deactivation stops sign-in and retains related records. Access can be restored.</p>
                  {loadingRead ? <p>Loading mentors...</p> : <table className="data-table">
                    <thead><tr><th>Name</th><th>Username</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>{filteredMentors.map(mentor => {
                      const inactive = mentor.isActive === false || mentor.accessAllowed === 'denied';
                      return <tr key={mentor._id || mentor.id}>
                        <td>{mentor.name} {mentor.surname}</td><td>{mentor.username}</td>
                        <td>{inactive ? 'Inactive' : 'Active'}</td>
                        <td><button type="button" onClick={() => setMentorAccess(mentor, inactive)}>{inactive ? 'Activate' : 'Deactivate'}</button></td>
                      </tr>;
                    })}</tbody>
                  </table>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
