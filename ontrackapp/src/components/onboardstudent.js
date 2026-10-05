import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OnboardStudent.css";
import { tokenManager } from '../services/authMiddleware';
import { authAPI } from "../services/authMiddleware";

export default function ManageStudents() {
  const [activeTab, setActiveTab] = useState("create");
  // We extract form data into a single state object for easier management
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    cellnumber: "",
    program: "",
    track: "",
    username: "",
    password: "",
    accessAllowed: "granted"
  });

  // Students list and related states
  const [students, setStudents] = useState([]);
  // Separate state for update form data to avoid conflicts with create form
  const [updateFormData, setUpdateFormData] = useState({});
    // Error and success message states
  const [errors, setErrors] = useState([]);
  // Loading state for form submissions
  const [successMessage, setSuccessMessage] = useState("");
  // Loading state for form submissions
  const [loading, setLoading] = useState(false);
  // Search state for filtering students in read and delete tabs
  const [searchTerm, setSearchTerm] = useState("");

  // Navigation hook for potential redirects after actions
  const navigate = useNavigate();

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

  // Handle input changes for both create and update forms
  function handleInputChange(field, value) {
    updateForm({ [field]: value });
  }

  // API configuration - use relative URLs in development (proxied), absolute in production
  const showMessage = (text, type = "success") => {
    // Type can be "success" or "error"
    if (type === "success") {
      setSuccessMessage(text);
      setTimeout(() => setSuccessMessage(""), 4000);
    } else {
      setErrors([{ field: "general", message: text }]);
      setTimeout(() => setErrors([]), 4000);
    }
  };

  // Static data for programs and tracks - in a real app, these would likely come from an API
  const programs = [
    { _id: "1", name: "Mentorship Program" },
    { _id: "2", name: "Internship Program" },
    { _id: "3", name: "Skill Development Program" },
    { _id: "4", name: "Graduate Program" }
  ];

  const tracks = [
    { _id: "1", name: "Web Development" },
    { _id: "2", name: "Java Programming" },
    { _id: "3", name: "C# Programming" },
    { _id: "4", name: "Python Programming" },
    { _id: "5", name: "Robotics" },
    { _id: "6", name: "Compukids" },
    { _id: "7", name: "CompuTeens" },
    { _id: "8", name: "Digital Entrepreneurship" }
  ];

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate cell number
  const validateCellNumber = (cellnumber) => {
    const cellRegex = /^[0-9]{10}$/;
    return cellRegex.test(cellnumber);
  };

  // CREATE STUDENT
  const isCreateFormValid =
    formData.name.trim() &&
    formData.surname.trim() &&
    formData.email.trim() &&
    validateEmail(formData.email.trim()) &&
    formData.cellnumber.trim() &&
    validateCellNumber(formData.cellnumber.trim()) &&
    formData.program &&
    formData.track &&
    formData.username.trim() &&
    formData.password.trim();

    // Handle create student form submission
    // We use async/await for cleaner asynchronous code and better error handling
  async function handleCreateSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    setSuccessMessage("");

    // Validation

    try {
      const response = await fetch("/api/onboardstudents/onboardstudent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          surname: formData.surname.trim(),
          email: formData.email.trim(),
          cellnumber: formData.cellnumber.trim(),
          username: formData.username.trim(),
          password: formData.password.trim(),
          program: formData.program.trim(),
          track: formData.track.trim()
        })
      });

      // We attempt to parse the response as JSON regardless of status to extract error messages
      const data = await response.json();

      // Handle errors based on response status and content
      if (!response.ok) {
        // The API might return validation errors in an "errors" array or a general message in "message"
        if (Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else if (data.message) {
          setErrors([{ field: "general", message: data.message }]);
        } else {
          setErrors([{ field: "general", message: "Student creation failed. Try again." }]);
        }
        setLoading(false);
        return;
      }

      showMessage(`✅ Student "${formData.name} ${formData.surname}" created successfully!`);
      
      // Reset form
      setFormData({
        name: "",
        surname: "",
        email: "",
        cellnumber: "",
        program: "",
        track: "",
        username: "",
        password: "",
        accessAllowed: "granted"
      });

      // Refresh students list
      loadStudents();
      
    } catch (error) {
      setErrors([{ field: "general", message: "Network error. Try again." }]);
    }

    setLoading(false);
  }

  // READ STUDENTS
  // We separate the loadStudents function for the read tab and the update tab to ensure we can manage state appropriately for each
  
  const loadStudents = async () => {
    try {
      const response = await fetch("/api/onboardstudents", {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      } else {
        showMessage("Failed to load students.", "error");
      }
    } catch (error) {
      showMessage("Network error loading students.", "error");
    }
  };

  // UPDATE STUDENT
  const loadStudentsForUpdate = async () => {
    try {
      const response = await fetch("/api/onboardstudents", {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);

        // Initialize updateFormData with current student values
        const initialUpdateData = {};
        data.forEach(student => {
          initialUpdateData[student._id || student.id] = {
            name: student.name || '',
            surname: student.surname || '',
            email: student.email || '',
            cellnumber: student.cellnumber || '',
            program: student.program || '',
            track: student.track || '',
            accessAllowed: student.accessAllowed || 'granted'
          };
        });
        setUpdateFormData(initialUpdateData);
      }
    } catch (error) {
      showMessage("Failed to load students for update.", "error");
    }
  };

  // Handle changes in the update form inputs
  // We maintain a separate state object (updateFormData) keyed by student ID to track changes for each student being edited
  const handleUpdateChange = (id, field, value) => {
    setUpdateFormData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));  
  };

 // When the user clicks "Save" for a student, we send a PATCH request with the updated data for that specific student
 // We also handle success and error messages appropriately
  const updateStudent = async (id) => {
    try {
      const studentData = updateFormData[id] || {};
      const response = await fetch(`/api/onboardstudents/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        body: JSON.stringify(studentData)
      });
    // We attempt to parse the response as JSON to extract any messages or errors
      if (response.ok) {
        showMessage(`✅ Student ${id} updated successfully!`);
        loadStudents();
        loadStudentsForUpdate();
      } else {
        showMessage("Error updating student.", "error");
      }
    } catch (error) {
      showMessage("Network error updating student.", "error");
    }
  };

  // If the user clicks "Cancel" while editing a student, we simply reload the students data to reset the form inputs for that student
  const cancelEdit = (id) => {
    showMessage(`❌ Edit for Student ${id} cancelled`);
    loadStudentsForUpdate();
  };

  // DELETE STUDENT
  // When the user clicks "Delete" for a student, we send a DELETE request to the API with the student's ID
  const deleteStudent = async (id, studentName) => {
    try {
      const response = await fetch(`/api/onboardstudents/${id}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showMessage(`✅ Student "${studentName}" deleted successfully`);
        // Optimistic update: remove student from local state immediately
        setStudents(prev => prev.filter(student => student._id !== id && student.id !== id));
      } else if (response.status === 404) {
        showMessage("Student not found.", "error");
      } else {
        showMessage("Error deleting student.", "error");
      }
    } catch (error) {
      showMessage("Network error deleting student.", "error");
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors([]);
    setSuccessMessage("");
    if (tab === "read") loadStudents();
    if (tab === "update") loadStudentsForUpdate();
    if (tab === "delete") loadStudents();
  };

  // Filter students for search
  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.program?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.track?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadStudents();
  }, []);

  return (
    <div className="manage-students-container">
      <div className="manage-students-card">
        <div className="manage-students-header">
          <div className="header-icon">👨‍🎓</div>
          <h1 className="manage-students-title">Manage Students</h1>
          <p className="manage-students-subtitle">Create, view, update, and delete student records</p>
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
              Create Student
            </button>
            <button 
              className={`tab-students ${activeTab === "read" ? "active" : ""}`}
              onClick={() => handleTabChange("read")}
            >
              View Students
            </button>
            <button 
              className={`tab-students ${activeTab === "update" ? "active" : ""}`}
              onClick={() => handleTabChange("update")}
            >
              Update Students
            </button>
            <button 
              className={`tab-students ${activeTab === "delete" ? "active" : ""}`}
              onClick={() => handleTabChange("delete")}
            >
              Delete Student
            </button>
          </div>

          <div className="tab-content-students">
            {/* CREATE TAB */}
            {activeTab === "create" && (
              <div className="tab-pane-students active">
                <div className="form-section">
                  <h3 className="section-title">Create New Student</h3>
                  <form onSubmit={handleCreateSubmit} className="students-form">
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
                          <label className="form-label">Email *</label>
                          <input
                            type="email"
                            className={`form-input ${getFieldError("email") ? "error" : ""}`}
                            placeholder="student@example.com"
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
                            type="text"
                            className={`form-input ${getFieldError("cellnumber") ? "error" : ""}`}
                            placeholder="0122342569"
                            value={formData.cellnumber}
                            onChange={(e) => handleInputChange("cellnumber", e.target.value)}
                            disabled={loading}
                          />
                          {getFieldError("cellnumber") && (
                            <span className="error-message">{getFieldError("cellnumber")}</span>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Username *</label>
                          <input
                            type="text"
                            className={`form-input ${getFieldError("username") ? "error" : ""}`}
                            placeholder="Enter Username"
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
                            className={`form-input ${getFieldError("password") ? "error" : ""}`}
                            placeholder="Enter Password"
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

                    {/* ACADEMIC INFORMATION */}
                    <div className="form-section">
                      <h4 className="section-subtitle">Academic Information</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Program *</label>
                          <select
                            className={`form-select ${getFieldError("program") ? "error" : ""}`}
                            value={formData.program}
                            onChange={(e) => handleInputChange("program", e.target.value)}
                            disabled={loading}
                          >
                            <option value="">-- Select Program --</option>
                            {programs.map((p) => (
                              <option key={p._id} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          {getFieldError("program") && (
                            <span className="error-message">{getFieldError("program")}</span>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Track *</label>
                          <select
                            className={`form-select ${getFieldError("track") ? "error" : ""}`}
                            value={formData.track}
                            onChange={(e) => handleInputChange("track", e.target.value)}
                            disabled={loading}
                          >
                            <option value="">-- Select Track --</option>
                            {tracks.map((t) => (
                              <option key={t._id} value={t.name}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          {getFieldError("track") && (
                            <span className="error-message">{getFieldError("track")}</span>
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
                        {loading ? "Creating Student..." : "➕ Create Student"}
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
                    <h3 className="section-title">View Students</h3>
                    <div className="search-refresh-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button onClick={loadStudents} className="refresh-button">
                        🔄 Refresh
                      </button>
                    </div>
                  </div>
                  
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Email</th>
                          <th>Program</th>
                          <th>Track</th>
                          <th>Username</th>
                          <th>Password</th>
                          <th>Access Allowed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(student => (
                          <tr key={student._id || student.id}>
                            <td>{student._id || student.id}</td>
                            <td>{student.name || 'N/A'}</td>
                            <td>{student.surname || 'N/A'}</td>
                            <td>{student.email || 'N/A'}</td>
                            <td>{student.program || 'N/A'}</td>
                            <td>{student.track || 'N/A'}</td>
                            <td>{student.username || 'N/A'}</td>
                            <td>••••••••</td>
                            <td>{student.accessAllowed || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredStudents.length === 0 && (
                      <div className="no-data-message">
                        {searchTerm ? "No students found matching your search." : "No students found."}
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
                  <h3 className="section-title">Update Students</h3>
                  <p className="section-subtitle">Edit student details and save changes</p>
                  
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Email</th>
                          <th>Cell Number</th>
                          <th>Program</th>
                          <th>Track</th>
                          <th>Access Allowed</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student._id || student.id}>
                            <td>{student._id || student.id}</td>
                            <td>
                              <input
                                type="text"
                                value={updateFormData[student._id || student.id]?.name || ''}
                                onChange={(e) => handleUpdateChange(student._id || student.id, "name", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={updateFormData[student._id || student.id]?.surname || ''}
                                onChange={(e) => handleUpdateChange(student._id || student.id, "surname", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <input
                                type="email"
                                value={updateFormData[student._id || student.id]?.email || ''}
                                onChange={(e) => handleUpdateChange(student._id || student.id, "email", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={updateFormData[student._id || student.id]?.cellnumber || ''}
                                onChange={(e) => handleUpdateChange(student._id || student.id, "cellnumber", e.target.value)}
                                className="update-input"
                              />
                            </td>
                            <td>
                              <select
                                value={updateFormData[student._id || student.id]?.program || ''}
                                onChange={(e) => handleUpdateChange(student._id || student.id, "program", e.target.value)}
                                className="update-select"
                              >
                                {programs.map((p) => (
                                  <option key={p._id} value={p.name}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                value={updateFormData[student._id || student.id]?.track || ''}
                                onChange={(e) => handleUpdateChange(student._id || student.id, "track", e.target.value)}
                                className="update-select"
                              >
                                {tracks.map((t) => (
                                  <option key={t._id} value={t.name}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                value={updateFormData[student._id || student.id]?.accessAllowed || ''}
                                onChange={(e) => handleUpdateChange(student._id || student.id, "accessAllowed", e.target.value)}
                                className="update-select"
                              >
                                <option value="granted">Granted</option>
                                <option value="denied">Denied</option>
                              </select>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => updateStudent(student._id || student.id)}
                                  className="update-btn"
                                >
                                  💾 Save
                                </button>
                                <button
                                  onClick={() => cancelEdit(student._id || student.id)}
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
                    {students.length === 0 && (
                      <div className="no-data-message">
                        No students available for update.
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
                  <div className="section-header">
                    <h3 className="section-title">Delete Students</h3>
                    <p className="section-subtitle">Select a student to permanently remove from the system</p>
                    <div className="search-refresh-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <button onClick={loadStudents} className="refresh-button">
                        🔄 Refresh
                      </button>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Email</th>
                          <th>Program</th>
                          <th>Track</th>
                          <th>Username</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(student => (
                          <tr key={student._id || student.id}>
                            <td>{student._id || student.id}</td>
                            <td>{student.name}</td>
                            <td>{student.surname}</td>
                            <td>{student.email}</td>
                            <td>{student.program}</td>
                            <td>{student.track}</td>
                            <td>{student.username}</td>
                            <td>
                              <button
                                onClick={() => deleteStudent(student._id || student.id, `${student.name} ${student.surname}`)}
                                className="delete-btn"
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredStudents.length === 0 && (
                      <div className="no-data-message">
                        {searchTerm ? "No students found matching your search." : "No students available for deletion."}
                      </div>
                    )}
                  </div>

                  <div className="form-requirements">
                    <span className="requirement-text warning">
                      ⚠️ Deletion is permanent and cannot be undone
                    </span>
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