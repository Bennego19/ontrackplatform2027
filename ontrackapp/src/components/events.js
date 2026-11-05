import { useState, useEffect } from "react";
import "./OnboardStudent.css";
import { tokenManager } from '../services/authMiddleware';

export default function Events() {
  const [activeTab, setActiveTab] = useState("create");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: "",
    type: "",
    link: ""
  });

  const [events, setEvents] = useState([]);
  const [updateFormData, setUpdateFormData] = useState({});
  const [deleteId, setDeleteId] = useState("");
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");


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

  // CREATE EVENT
  const isCreateFormValid =
    formData.name &&
    formData.description &&
    formData.date &&
    formData.type &&
    formData.link;

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    setSuccessMessage("");

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenManager.getToken()}` },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          date: formData.date,
          type: formData.type,
          link: formData.link.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else if (data.message) {
          setErrors([{ field: "general", message: data.message }]);
        } else {
          setErrors([{ field: "general", message: "Event creation failed. Try again." }]);
        }
        setLoading(false);
        return;
      }

      showMessage(`✅ Event "${formData.name}" created successfully!`);

      // Reset form
      setFormData({
        name: "",
        description: "",
        date: "",
        type: "",
        link: ""
      });

      // Refresh events list
      loadEvents();

    } catch (error) {
      setErrors([{ field: "general", message: "Network error. Try again." }]);
    }

    setLoading(false);
  }

  // READ EVENTS
  const loadEvents = async () => {
    try {
      const response = await fetch("/api/events", { headers: { Authorization: `Bearer ${tokenManager.getToken()}` } });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        showMessage("Failed to load events.", "error");
      }
    } catch (error) {
      showMessage("Network error loading events.", "error");
    }
  };

  // UPDATE EVENT
  const loadEventsForUpdate = async () => {
    try {
      const response = await fetch("/api/events", {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      showMessage("Failed to load events for update.", "error");
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

  const updateEvent = async (id) => {
    try {
      const eventData = updateFormData[id] || {};
      const response = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenManager.getToken()}` },
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        showMessage(`✅ Event ${id} updated successfully!`);
        loadEvents();
        loadEventsForUpdate();
      } else {
        showMessage("Error updating event.", "error");
      }
    } catch (error) {
      showMessage("Network error updating event.", "error");
    }
  };

  const cancelEdit = (id) => {
    showMessage(`❌ Edit for Event ${id} cancelled`);
    loadEventsForUpdate();
  };

  // DELETE EVENT
  const handleDeleteSubmit = async (e) => {
    e.preventDefault();

    if (!deleteId) {
      showMessage("Please enter an event ID to delete.", "error");
      return;
    }

    try {
      const response = await fetch(`/api/events/${deleteId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showMessage(`✅ Event ${deleteId} deleted successfully`);
        setDeleteId("");
        loadEvents();
      } else if (response.status === 404) {
        showMessage("Event not found.", "error");
      } else {
        showMessage("Error deleting event.", "error");
      }
    } catch (error) {
      showMessage("Network error deleting event.", "error");
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors([]);
    setSuccessMessage("");
    if (tab === "read") loadEvents();
    if (tab === "update") loadEventsForUpdate();
  };

  // Filter events for search
  const filteredEvents = events.filter(event =>
    event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadEvents();
    // Load once on mount; tab actions explicitly refresh the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="manage-students-container">
      <div className="manage-students-card">
        <div className="manage-students-header">
          <div className="header-icon">📅</div>
          <h1 className="manage-students-title">Manage Events</h1>
          <p className="manage-students-subtitle">Create, view, update, and delete event records</p>
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

        <div className="tab-container-students">
          {/* Tabs */}
          <div className="tabs-students">
            <button
              className={`tab-students ${activeTab === "create" ? "active" : ""}`}
              onClick={() => handleTabChange("create")}
            >
              Create Event
            </button>
            <button
              className={`tab-students ${activeTab === "read" ? "active" : ""}`}
              onClick={() => handleTabChange("read")}
            >
              View Events
            </button>
            <button
              className={`tab-students ${activeTab === "update" ? "active" : ""}`}
              onClick={() => handleTabChange("update")}
            >
              Update Events
            </button>
            <button
              className={`tab-students ${activeTab === "delete" ? "active" : ""}`}
              onClick={() => handleTabChange("delete")}
            >
              Delete Event
            </button>
          </div>

          <div className="tab-content-students">
            {/* CREATE TAB */}
            {activeTab === "create" && (
              <div className="tab-pane-students active">
                <div className="form-section">
                  <h3 className="section-title">Create New Event</h3>
                  <form onSubmit={handleCreateSubmit} className="students-form">
                    {/* EVENT INFORMATION */}
                    <div className="form-section">
                      <h4 className="section-subtitle">Event Information</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Name *</label>
                          <input
                            type="text"
                            className={`form-input ${getFieldError("name") ? "error" : ""}`}
                            placeholder="Enter event name"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("name") && (
                            <span className="error-message">{getFieldError("name")}</span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Description *</label>
                          <textarea
                            className={`form-input ${getFieldError("description") ? "error" : ""}`}
                            placeholder="Enter event description"
                            value={formData.description}
                            onChange={(e) => handleInputChange("description", e.target.value)}
                            disabled={loading}
                            rows="3"
                          />
                          {getFieldError("description") && (
                            <span className="error-message">{getFieldError("description")}</span>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Date *</label>
                          <input
                            type="date"
                            className={`form-input ${getFieldError("date") ? "error" : ""}`}
                            value={formData.date}
                            onChange={(e) => handleInputChange("date", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("date") && (
                            <span className="error-message">{getFieldError("date")}</span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Type *</label>
                          <select
                            className={`form-input ${getFieldError("type") ? "error" : ""}`}
                            value={formData.type}
                            onChange={(e) => handleInputChange("type", e.target.value)}
                            disabled={loading}
                          >
                            <option value="">Select Type</option>
                            <option value="inperson">In-Person</option>
                            <option value="online">Online</option>
                          </select>
                          {getFieldError("type") && (
                            <span className="error-message">{getFieldError("type")}</span>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Link *</label>
                          <input
                            type="url"
                            className={`form-input ${getFieldError("link") ? "error" : ""}`}
                            placeholder="https://example.com"
                            value={formData.link}
                            onChange={(e) => handleInputChange("link", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("link") && (
                            <span className="error-message">{getFieldError("link")}</span>
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
                        {loading ? "Creating Event..." : "➕ Create Event"}
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
              <div className="tab-pane-students active">
                <div className="form-section">
                  <div className="section-header">
                    <h3 className="section-title">View Events</h3>
                    <div className="search-refresh-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button onClick={loadEvents} className="refresh-button">
                        🔄 Refresh
                      </button>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvents.map(event => (
                          <tr key={event._id || event.id}>
                            <td>{event._id || event.id}</td>
                            <td>{event.name}</td>
                            <td>{event.description}</td>
                            <td>{event.date}</td>
                            <td>{event.type}</td>
                            <td><a href={event.link} target="_blank" rel="noopener noreferrer">{event.link}</a></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredEvents.length === 0 && (
                      <div className="no-data-message">
                        {searchTerm ? "No events found matching your search." : "No events found."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* UPDATE TAB */}
            {activeTab === "update" && (
              <div className="tab-pane-students active">
                <div className="form-section">
                  <h3 className="section-title">Update Events</h3>
                  <p className="section-subtitle">Edit event details and save changes</p>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Link</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map(event => (
                          <tr key={event._id || event.id}>
                            <td>{event._id || event.id}</td>
                            <td>
                              <input
                                type="text"
                                defaultValue={event.name}
                                onChange={(e) => handleUpdateChange(event._id || event.id, "name", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <textarea
                                defaultValue={event.description}
                                onChange={(e) => handleUpdateChange(event._id || event.id, "description", e.target.value)}
                                className="update-input"
                                rows="2"
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                defaultValue={event.date}
                                onChange={(e) => handleUpdateChange(event._id || event.id, "date", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <select
                                defaultValue={event.type}
                                onChange={(e) => handleUpdateChange(event._id || event.id, "type", e.target.value)}
                                className="update-input"
                              >
                                <option value="inperson">In-Person</option>
                                <option value="online">Online</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="url"
                                defaultValue={event.link}
                                onChange={(e) => handleUpdateChange(event._id || event.id, "link", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => updateEvent(event._id || event.id)}
                                  className="update-btn"
                                >
                                  💾 Save
                                </button>
                                <button
                                  onClick={() => cancelEdit(event._id || event.id)}
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
                    {events.length === 0 && (
                      <div className="no-data-message">
                        No events available for update.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DELETE TAB */}
            {activeTab === "delete" && (
              <div className="tab-pane-students active">
                <div className="form-section">
                  <h3 className="section-title">Delete Event</h3>
                  <p className="section-subtitle">Permanently remove an event from the system</p>

                  <form onSubmit={handleDeleteSubmit} className="students-form">
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label className="form-label">Event ID to Delete *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={deleteId}
                          onChange={(e) => setDeleteId(e.target.value)}
                          placeholder="Enter Event ID"
                          required
                        />
                        <div className="input-hint">
                          Enter the exact ID of the event you want to delete
                        </div>
                      </div>
                    </div>

                    <div className="action-section">
                      <button
                        type="submit"
                        disabled={!deleteId}
                        className="delete-button"
                      >
                        🗑️ Delete Event
                      </button>

                      <div className="form-requirements">
                        <span className="requirement-text warning">
                          ⚠️ This action cannot be undone
                        </span>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
