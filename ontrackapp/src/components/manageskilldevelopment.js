import React, { useState, useEffect } from "react";
import axios from "axios";
import { tokenManager } from "../services/authMiddleware";
import { studentTracks as tracks } from '../config/studentTracks';
import "./managementor.css";

export default function ManageSkillDevelopment() {
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [updateAssessments, setUpdateAssessments] = useState([]);

  const [formData, setFormData] = useState({
    assessmentname: "",
    assessmenttype: "",
    dateadded: "",
    datedue: "",
    track: "",
    document: null
  });

  const [updateFormData, setUpdateFormData] = useState({});

  const assessmentTypes = ["task", "assignment", "project", "module"];
  const showMessage = (text, type = "success") => {
    if (type === "success") {
      setSuccessMessage(text);
      setTimeout(() => setSuccessMessage(""), 4000);
    } else {
      setErrors([{ field: "general", message: text }]);
      setTimeout(() => setErrors([]), 4000);
    }
  };

  // CREATE TAB FUNCTIONS
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.length > 0) setErrors([]);
    if (successMessage) setSuccessMessage("");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.assessmentname || !formData.assessmenttype || !formData.dateadded || 
        !formData.datedue || !formData.track) {
      showMessage("Please fill out all required fields.", "error");
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key]) {
        data.append(key, formData[key]);
      }
    });

    // Set program to Skill Development Program by default
    data.append("program", "Skill Development Program");

    setLoading(true);

    try {
      const token = tokenManager.getToken();
      await axios.post("/api/assessments", data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      });

      showMessage(`✅ Assessment "${formData.assessmentname}" created successfully!`);
      
      // Reset form
      setFormData({
        assessmentname: "",
        assessmenttype: "",
        dateadded: "",
        datedue: "",
        track: "",
        document: null
      });

      // Refresh assessments list
      loadAssessments();
      
    } catch (error) {
      console.error(error);
      showMessage("Failed to create assessment. Please try again.", "error");
    }

    setLoading(false);
  };

  // READ TAB FUNCTIONS
  const loadAssessments = async () => {
    try {
      const token = tokenManager.getToken();
      const response = await axios.get("/api/assessments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssessments(Array.isArray(response.data) ? response.data.filter(item => item.program === 'Skill Development Program') : []);
    } catch (error) {
      console.error("Error loading assessments:", error);
      setAssessments([]);
    }
  };

  // UPDATE TAB FUNCTIONS
  const loadUpdateTable = async () => {
    try {
      const token = tokenManager.getToken();
      const response = await axios.get("/api/assessments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filteredAssessments = response.data.filter(assessment => assessment.program === "Skill Development Program");
      setUpdateAssessments(filteredAssessments);
    } catch (error) {
      console.error("Error loading assessments for update:", error);
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

  const updateAssessment = async (id) => {
    try {
      const assessmentData = updateFormData[id] || {};
      const dataToSend = {
        ...assessmentData,
        program: "Skill Development Program"
      };

      const token = tokenManager.getToken();
      await axios.patch(`/api/assessments/${id}`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showMessage(`✅ Assessment ${id} updated successfully!`);
      // Clear update form data for this assessment
      setUpdateFormData(prev => {
        const newData = { ...prev };
        delete newData[id];
        return newData;
      });
      loadAssessments();
      loadUpdateTable();
    } catch (error) {
      console.error(error);
      showMessage("Error updating assessment. Please try again.", "error");
    }
  };

  const cancelEdit = (id) => {
    showMessage(`❌ Edit for Assessment ${id} cancelled`);
    loadUpdateTable();
  };

  // DELETE TAB FUNCTIONS
  const handleDeleteSubmit = async (id) => {
    try {
      const token = tokenManager.getToken();
      await axios.delete(`/api/assessments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage(`✅ Assessment deleted successfully`);
      loadAssessments();
    } catch (error) {
      console.error(error);
      if (error.response?.status === 404) {
        showMessage("Assessment not found.", "error");
      } else {
        showMessage("Error deleting assessment. Please try again.", "error");
      }
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors([]);
    setSuccessMessage("");
    if (tab === "read") loadAssessments();
    if (tab === "update") loadUpdateTable();
    if (tab === "delete") loadAssessments();
  };

  useEffect(() => {
    loadAssessments();
    loadUpdateTable();
  }, []);

  const isCreateFormValid = 
    formData.assessmentname && 
    formData.assessmenttype && 
    formData.dateadded && 
    formData.datedue && 
    formData.track;

  const formatTrackName = (track) => {
    const trackMap = {
      "webdev": "Web Development",
      "java": "Java Programming", 
      "csharp": "C# Programming",
      "python": "Python Programming"
    };
    return trackMap[track] || track;
  };

  // Normalize display fields and id fallbacks
  const getId = (item) => item?.id || item?._id || '';

  const getName = (item) => {
    if (!item) return '';
    return item.name || item.assessmentname || item.title || item.moduleName || item.resourceName || '';
  };

  const getType = (item) => item?.assessmenttype || item?.type || '';

  return (
    <div className="manage-mentorship-container">
      <div className="manage-mentorship-card">
        <div className="manage-mentorship-header">
          <div className="header-icon">📚</div>
          <h1 className="manage-mentorship-title">Manage Skills Development </h1>
          <p className="manage-mentorship-subtitle">Create and manage skill development assessments and resources</p>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && <div className="success-message">{successMessage}</div>}

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

        <div className="tab-container-mentorship">
          {/* Tabs */}
          <div className="tabs-mentorship">
            <button 
              className={`tab-mentorship ${activeTab === "create" ? "active" : ""}`}
              onClick={() => handleTabChange("create")}
            >
              Create Assessment
            </button>
            <button 
              className={`tab-mentorship ${activeTab === "read" ? "active" : ""}`}
              onClick={() => handleTabChange("read")}
            >
              View Assessments
            </button>
            <button 
              className={`tab-mentorship ${activeTab === "update" ? "active" : ""}`}
              onClick={() => handleTabChange("update")}
            >
              Update Assessments
            </button>
            <button 
              className={`tab-mentorship ${activeTab === "delete" ? "active" : ""}`}
              onClick={() => handleTabChange("delete")}
            >
              Delete Assessment
            </button>
          </div>

          <div className="tab-content-mentorship">
            {/* CREATE TAB */}
            {activeTab === "create" && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <h3 className="section-title">Create New Assessment</h3>
                  <form onSubmit={handleCreateSubmit} className="mentorship-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Assessment Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.assessmentname}
                          onChange={(e) => handleFormChange("assessmentname", e.target.value)}
                          placeholder="Enter Assessment Name"
                          disabled={loading}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Assessment Type *</label>
                        <select
                          className="form-select"
                          value={formData.assessmenttype}
                          onChange={(e) => handleFormChange("assessmenttype", e.target.value)}
                          disabled={loading}
                          required
                        >
                          <option value="">-- Select Type --</option>
                          {assessmentTypes.map((type, index) => (
                            <option key={index} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Date Added *</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.dateadded}
                          onChange={(e) => handleFormChange("dateadded", e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Date Due *</label>
                        <input
                          type="date"
                          className="form-input"
                          value={formData.datedue}
                          onChange={(e) => handleFormChange("datedue", e.target.value)}
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Track *</label>
                        <select
                          className="form-select"
                          value={formData.track}
                          onChange={(e) => handleFormChange("track", e.target.value)}
                          disabled={loading}
                          required
                        >
                          <option value="">-- Select Track --</option>
                          {tracks.map((track, index) => (
                            <option key={index} value={track}>
                              {formatTrackName(track)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Upload Document</label>
                        <input
                          type="file"
                          className="form-input"
                          onChange={(e) => handleFormChange("document", e.target.files[0])}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="action-section">
                      <button
                        type="submit"
                        disabled={!isCreateFormValid || loading}
                        className={`submit-button ${loading ? "loading" : ""}`}
                      >
                        {loading ? "Creating Assessment..." : "➕ Create Assessment"}
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
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <div className="section-header">
                    <h3 className="section-title">View Assessments</h3>
                    <button onClick={loadAssessments} className="refresh-button">
                      🔄 Refresh
                    </button>
                  </div>
                  
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Date Added</th>
                          <th>Date Due</th>
                          <th>Track</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessments.map(assessment => (
                          <tr key={getId(assessment)}>
                            <td>{getId(assessment)}</td>
                            <td>{getName(assessment)}</td>
                            <td>{getType(assessment)}</td>
                            <td>{assessment.dateadded ? assessment.dateadded.split('T')[0] : ''}</td>
                            <td>{assessment.datedue ? assessment.datedue.split('T')[0] : ''}</td>
                            <td>{formatTrackName(assessment.track)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {assessments.length === 0 && (
                      <div className="no-data-message">
                        No assessments found.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* UPDATE TAB */}
            {activeTab === "update" && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <h3 className="section-title">Update Assessments</h3>
                  <p className="section-subtitle">Edit assessment details and save changes</p>
                  
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Assessment Name</th>
                          <th>Assessment Type</th>
                          <th>Date Added</th>
                          <th>Date Due</th>
                          <th>Track</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {updateAssessments.map(assessment => (
                          <tr key={getId(assessment)}>
                            <td>{getId(assessment)}</td>
                            <td>
                              <input
                                type="text"
                                value={updateFormData[getId(assessment)]?.assessmentname ?? (assessment.assessmentname || getName(assessment))}
                                onChange={(e) => handleUpdateChange(getId(assessment), "assessmentname", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <select
                                value={updateFormData[getId(assessment)]?.assessmenttype ?? (assessment.assessmenttype || getType(assessment))}
                                onChange={(e) => handleUpdateChange(getId(assessment), "assessmenttype", e.target.value)}
                                className="update-select"
                              >
                                {assessmentTypes.map((type, index) => (
                                  <option key={index} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="date"
                                value={updateFormData[getId(assessment)]?.dateadded ?? (assessment.dateadded ? assessment.dateadded.split('T')[0] : '')}
                                onChange={(e) => handleUpdateChange(getId(assessment), "dateadded", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                value={updateFormData[getId(assessment)]?.datedue ?? (assessment.datedue ? assessment.datedue.split('T')[0] : '')}
                                onChange={(e) => handleUpdateChange(getId(assessment), "datedue", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <select
                                value={updateFormData[getId(assessment)]?.track ?? assessment.track}
                                onChange={(e) => handleUpdateChange(getId(assessment), "track", e.target.value)}
                                className="update-select"
                              >
                                {tracks.map((track, index) => (
                                  <option key={index} value={track}>
                                    {formatTrackName(track)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => updateAssessment(getId(assessment))}
                                  className="update-btn"
                                >
                                  💾 Save
                                </button>
                                <button
                                  onClick={() => cancelEdit(getId(assessment))}
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
                    {updateAssessments.length === 0 && (
                      <div className="no-data-message">
                        No assessments available for update.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DELETE TAB */}
            {activeTab === "delete" && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <h3 className="section-title">Delete Assessment</h3>
                  <p className="section-subtitle">Permanently remove an assessment from the system</p>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Date Added</th>
                          <th>Date Due</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessments.map(assessment => (
                          <tr key={getId(assessment)}>
                            <td>{getName(assessment)}</td>
                            <td>{getType(assessment)}</td>
                            <td>{assessment.dateadded ? assessment.dateadded.split('T')[0] : ''}</td>
                            <td>{assessment.datedue ? assessment.datedue.split('T')[0] : ''}</td>
                            <td>
                              <button
                                onClick={() => handleDeleteSubmit(getId(assessment))}
                                className="delete-btn"
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {assessments.length === 0 && (
                      <div className="no-data-message">
                        No assessments available for deletion.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
