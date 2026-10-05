import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { tokenManager } from "../services/authMiddleware";
import "./managementor.css";

export default function ManageResources() {
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [resources, setResources] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    program: "",
    track: "",
    document: null
  });

  const [updateFormData, setUpdateFormData] = useState({});

  const navigate = useNavigate();

  const programs = ["Web Development", "Java Programming", "C# Programming", "Python Programming"];
  const tracks = ["webdev", "java", "csharp", "python"];

  // Helper: extract field-specific errors
  function getFieldError(fieldName) {
    const err = errors.find(e => e.field === fieldName);
    return err ? err.message : "";
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

  // CREATE TAB FUNCTIONS
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.length > 0) setErrors([]);
    if (successMessage) setSuccessMessage("");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.program || !formData.track) {
      showMessage("Please fill out all required fields.", "error");
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key]) {
        data.append(key, formData[key]);
      }
    });

    setLoading(true);

    try {
      const token = tokenManager.getToken();
      const response = await axios.post("/api/resources", data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      });

      showMessage(`✅ Resource "${response.data.name}" added successfully!`);

      // Reset form
      setFormData({
        name: "",
        program: "",
        track: "",
        document: null
      });

      // Refresh resources list
      loadResources();

    } catch (error) {
      console.error(error);
      if (error.response?.status === 403) {
        showMessage("Access denied. Please log in again.", "error");
      } else {
        showMessage("Failed to create resource. Please try again.", "error");
      }
    }

    setLoading(false);
  };

  const loadResources = async () => {
    setLoading(true);
    try {
      const token = tokenManager.getToken();
      const response = await axios.get("/api/resources", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setResources(response.data);
    } catch (error) {
      console.error("Error loading resources:", error);
      if (error.response?.status === 403) {
        showMessage("Access denied. Please log in again.", "error");
      } else {
        showMessage("Failed to load resources.", "error");
      }
    }
    setLoading(false);
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

  const updateResource = async (id) => {
    try {
      const token = tokenManager.getToken();
      const resourceData = updateFormData[id] || {};

      await axios.put(`/api/resources/${id}`, resourceData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      showMessage(`✅ Resource ${id} updated successfully!`);
      loadResources();
    } catch (error) {
      console.error(error);
      if (error.response?.status === 403) {
        showMessage("Access denied. Please log in again.", "error");
      } else {
        showMessage("Error updating resource. Please try again.", "error");
      }
    }
  };

  const cancelEdit = (id) => {
    showMessage(`❌ Edit for Resource ${id} cancelled`);
    loadResources();
  };

  // DELETE TAB FUNCTIONS
  const handleDeleteSubmit = async (id) => {
    try {
      const token = tokenManager.getToken();
      await axios.delete(`/api/resources/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      showMessage(`✅ Resource deleted successfully`);
      loadResources();
    } catch (error) {
      console.error(error);
      if (error.response?.status === 403) {
        showMessage("Access denied. Please log in again.", "error");
      } else if (error.response?.status === 404) {
        showMessage("Resource not found.", "error");
      } else {
        showMessage("Error deleting resource. Please try again.", "error");
      }
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors([]);
    setSuccessMessage("");
    loadResources();
  };

  useEffect(() => {
    loadResources();
  }, []);

  const isCreateFormValid =
    formData.name &&
    formData.program &&
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

  return (
    <div className="manage-mentorship-container">
      <div className="manage-mentorship-card">
        <div className="manage-mentorship-header">
          <div className="header-icon">📚</div>
          <h1 className="manage-mentorship-title">Manage Resources</h1>
          <p className="manage-mentorship-subtitle">Create and manage learning resources</p>
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
              Create Resource
            </button>
            <button
              className={`tab-mentorship ${activeTab === "read" ? "active" : ""}`}
              onClick={() => handleTabChange("read")}
            >
              View Resources
            </button>
            <button
              className={`tab-mentorship ${activeTab === "update" ? "active" : ""}`}
              onClick={() => handleTabChange("update")}
            >
              Update Resources
            </button>
            <button
              className={`tab-mentorship ${activeTab === "delete" ? "active" : ""}`}
              onClick={() => handleTabChange("delete")}
            >
              Delete Resource
            </button>
          </div>

          <div className="tab-content-mentorship">
            {/* CREATE TAB */}
            {activeTab === "create" && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <h3 className="section-title">Create New Resource</h3>
                  <form onSubmit={handleCreateSubmit} className="mentorship-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Resource Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.name}
                          onChange={(e) => handleFormChange("name", e.target.value)}
                          placeholder="Enter Resource Name"
                          disabled={loading}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Program *</label>
                        <select
                          className="form-select"
                          value={formData.program}
                          onChange={(e) => handleFormChange("program", e.target.value)}
                          disabled={loading}
                          required
                        >
                          <option value="">-- Select Program --</option>
                          {programs.map((program, index) => (
                            <option key={index} value={program}>
                              {program}
                            </option>
                          ))}
                        </select>
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

                    <div className="form-group">
                      <label className="form-label">Description / Website Link</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.description || ""}
                        onChange={(e) => handleFormChange("description", e.target.value)}
                        placeholder="Brief description or URL"
                        disabled={loading}
                      />
                    </div>

                    <button
                      type="submit"
                      className="submit-button"
                      disabled={loading || !isCreateFormValid}
                    >
                      {loading ? "Creating..." : "Create Resource"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* READ (VIEW) TAB */}
            {activeTab === "read" && (
              <div className="tab-pane-mentorship active">
                <h3 className="section-title">Available Resources</h3>
                <div className="table-responsive">
                  <table className="mentorship-table">
                    <thead>
                      <tr>
                        <th>Resource Name</th>
                        <th>Program</th>
                        <th>Track</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.length > 0 ? (
                        resources.map((res) => (
                          <tr key={res._id}>
                            <td className="font-bold">{res.name}</td>
                            <td>{res.program}</td>
                            <td>{formatTrackName(res.track)}</td>
                            <td>
                              {res.document ? (
                                <span className="badge-file">📄 Document</span>
                              ) : (
                                <span className="badge-link">🔗 Link/Text</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center">No resources found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* UPDATE TAB */}
            {activeTab === "update" && (
              <div className="tab-pane-mentorship active">
                <h3 className="section-title">Edit Existing Resources</h3>
                <div className="table-responsive">
                  <table className="mentorship-table">
                    <thead>
                      <tr>
                        <th>Resource Info</th>
                        <th>Categorization</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map((res) => (
                        <tr key={res._id}>
                          <td>
                            <input
                              type="text"
                              className="inline-input"
                              placeholder={res.name}
                              onChange={(e) => handleUpdateChange(res._id, "name", e.target.value)}
                            />
                            <input
                              type="text"
                              className="inline-input mt-1"
                              placeholder="Update description/link"
                              onChange={(e) => handleUpdateChange(res._id, "description", e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="inline-select"
                              onChange={(e) => handleUpdateChange(res._id, "program", e.target.value)}
                            >
                              <option value="">{res.program}</option>
                              {programs.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select
                              className="inline-select mt-1"
                              onChange={(e) => handleUpdateChange(res._id, "track", e.target.value)}
                            >
                              <option value="">{formatTrackName(res.track)}</option>
                              {tracks.map(t => <option key={t} value={t}>{formatTrackName(t)}</option>)}
                            </select>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                onClick={() => updateResource(res._id)} 
                                className="btn-save"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => cancelEdit(res._id)} 
                                className="btn-cancel"
                              >
                                Reset
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DELETE TAB */}
            {activeTab === "delete" && (
              <div className="tab-pane-mentorship active">
                <h3 className="section-title text-danger">Remove Resources</h3>
                <div className="table-responsive">
                  <table className="mentorship-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Program</th>
                        <th>Track</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map((res) => (
                        <tr key={res._id}>
                          <td>{res.name}</td>
                          <td>{res.program}</td>
                          <td>{formatTrackName(res.track)}</td>
                          <td>
                            <button
                              className="btn-delete"
                              onClick={() => {
                                if (window.confirm(`Delete "${res.name}"?`)) {
                                  handleDeleteSubmit(res._id);
                                }
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
