
import React, { useState, useEffect } from "react";
import { tokenManager } from "../services/authMiddleware";
import "./managementor.css";

export default function AssignMentor() {
  const [activeTab, setActiveTab] = useState("assign");
  const [mentors, setMentors] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [formData, setFormData] = useState({
    mentors: [],
    students: []
  });

  const [loading, setLoading] = useState(false);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    fetchAllData();
    // Load once on mount; assignment actions explicitly refresh the lists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMentors(),
        fetchStudents(),
        fetchAssignments()
      ]);
    } catch (error) {
      showMessage("Failed to load data. Please refresh the page.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      setLoadingMentors(true);
      console.log("Fetching mentors...");
      const response = await fetch("/api/onboardmentors", {
        headers: {
          Authorization: `Bearer ${tokenManager.getToken()}`,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      setMentors(data.filter(mentor => mentor.isActive !== false && mentor.accessAllowed !== 'denied'));
    } catch (error) {
      console.error("Error fetching mentors:", error);
      setMentors([]);
      showMessage("Failed to load mentors. Please try again.", "error");
    } finally {
      setLoadingMentors(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      console.log("Fetching students...");
      const response = await fetch("/api/onboardstudents", {
        headers: {
          Authorization: `Bearer ${tokenManager.getToken()}`,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      setStudents(data.filter(student => student.isActive !== false && student.accessAllowed === 'granted'));
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
      showMessage("Failed to load students. Please try again.", "error");
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch("/api/mentorstudentassignment/all", {
        headers: {
          Authorization: `Bearer ${tokenManager.getToken()}`,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const newErrors = [];
    if (formData.mentors.length === 0) newErrors.push({ field: "mentors", message: "Please select at least one mentor" });
    if (formData.students.length === 0) newErrors.push({ field: "students", message: "Please select at least one student" });
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const showMessage = (text, type = "success") => {
    const normalize = (t) => {
      if (!t && t !== 0) return "";
      if (typeof t === "string") return t;
      if (t && typeof t === "object") {
        if (t.message && typeof t.message === "string") return t.message;
        try {
          return JSON.stringify(t);
        } catch {
          return String(t);
        }
      }
      return String(t);
    };

    const msg = normalize(text);
    if (type === "success") {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(""), 4000);
    } else {
      setErrors([{ field: "general", message: msg }]);
      setTimeout(() => setErrors([]), 4000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showMessage("Please fix the errors in the form.", "error");
      return;
    }

    setLoading(true);
    try {
      // Prepare the data to send - arrays of mentor and student IDs
      const assignmentData = {
        mentorIds: formData.mentors,
        studentIds: formData.students
      };


      const response = await fetch("/api/mentorstudentassignment/student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${tokenManager.getToken()}`
        },
        body: JSON.stringify(assignmentData)
      });

      const result = await response.json();

      // Handle different response statuses
      if (response.status === 409) {
        // All assignments already exist
        showMessage(`⚠️ ${result.message || "All selected assignments already exist"}`, "error");
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to assign mentors");
      }

      // Handle the detailed response from backend
      const { successful, alreadyAssigned, errors: responseErrors } = result.results || {};

      let message = "";
      if (successful && successful.length > 0) {
        message += `✅ ${successful.length} assignment(s) created successfully!`;
      }
      if (alreadyAssigned && alreadyAssigned.length > 0) {
        message += ` ⚠️ ${alreadyAssigned.length} assignment(s) were already assigned.`;
      }
      if (responseErrors && responseErrors.length > 0) {
        message += ` ❌ ${responseErrors.length} assignment(s) failed.`;
      }

      if (message) {
        showMessage(message);
      } else {
        showMessage("✅ Assignments processed successfully!");
      }

      // Only clear form if there were successful assignments
      if (successful && successful.length > 0) {
        setFormData({ mentors: [], students: [] });
      }
      setErrors([]);
      fetchAssignments(); // Refresh the assignments list
    } catch (err) {
      console.error("Assignment error:", err);
      const errText = err && err.message ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
      showMessage(`❌ ${errText || "Failed to assign mentors. Please try again."}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      const response = await fetch(`/api/mentorstudentassignment/student/${assignmentId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete assignment");
      }

      showMessage("✅ Assignment deleted successfully!");
      fetchAssignments(); // Refresh the assignments list
    } catch (err) {
      console.error("Delete error:", err);
      const errText = err && err.message ? err.message : (typeof err === 'string' ? err : JSON.stringify(err));
      showMessage(`❌ ${errText || "Failed to delete assignment. Please try again."}`, "error");
    }
  };

  const isFormValid = formData.mentors.length > 0 && formData.students.length > 0;

  // Helper: extract field-specific errors
  function getFieldError(fieldName) {
    const err = errors.find(e => e.field === fieldName);
    return err ? err.message : "";
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors([]);
    setSuccessMessage("");
    if (tab === "view") fetchAssignments();
  };

  return (
    <div className="manage-mentorship-container">
      <div className="manage-mentorship-card">
        <div className="manage-mentorship-header">
          <div className="header-icon">👨‍🏫</div>
          <h1 className="manage-mentorship-title">Mentor Assignment Management</h1>
          <p className="manage-mentorship-subtitle">Assign mentors to students and manage existing assignments</p>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && <div className="success-message">{successMessage}</div>}

        {/* GENERAL ERRORS */}
        {Array.isArray(errors) && errors.some(e => e.field === "general") && (
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
              className={`tab-mentorship ${activeTab === "assign" ? "active" : ""}`}
              onClick={() => handleTabChange("assign")}
            >
              Assign Mentor
            </button>
            <button
              className={`tab-mentorship ${activeTab === "view" ? "active" : ""}`}
              onClick={() => handleTabChange("view")}
            >
              View Assignments
            </button>
          </div>

          <div className="tab-content-mentorship">
            {/* ASSIGN TAB */}
            {activeTab === "assign" && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <h3 className="section-title">Assign Mentors to Students</h3>
                  <p className="section-subtitle">Select multiple mentors and students to create assignments</p>

                  <form onSubmit={handleSubmit} className="mentorship-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Select Mentors *</label>
                        <select
                          multiple
                          className={`form-select ${getFieldError("mentors") ? "error" : ""}`}
                          value={formData.mentors}
                          onChange={(e) => {
                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                            handleInputChange("mentors", selectedOptions);
                          }}
                          disabled={loading || loadingMentors}
                          size="5"
                        >
                          {loadingMentors ? (
                            <option disabled>Loading mentors...</option>
                          ) : mentors && mentors.length > 0 ? mentors.map((mentor) => (
                            <option key={mentor._id} value={mentor._id}>
                              {mentor.name} {mentor.surname}
                            </option>
                          )) : (
                            <option disabled>No mentors available</option>
                          )}
                        </select>
                        {getFieldError("mentors") && <span className="error-message">{getFieldError("mentors")}</span>}
                        <div className="input-hint">Hold Ctrl/Cmd to select multiple mentors</div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Select Students *</label>
                        <select
                          multiple
                          className={`form-select ${getFieldError("students") ? "error" : ""}`}
                          value={formData.students}
                          onChange={(e) => {
                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                            handleInputChange("students", selectedOptions);
                          }}
                          disabled={loading || loadingStudents}
                          size="5"
                        >
                          {loadingStudents ? (
                            <option disabled>Loading students...</option>
                          ) : Array.isArray(students) && students.length > 0 ? students.map((student) => (
                            <option key={student._id} value={student._id}>
                              {student.name} {student.surname} {student.email ? `(${student.email})` : ''}
                            </option>
                          )) : (
                            <option disabled>No students available</option>
                          )}
                        </select>
                        {getFieldError("students") && <span className="error-message">{getFieldError("students")}</span>}
                        <div className="input-hint">Hold Ctrl/Cmd to select multiple students</div>
                      </div>
                    </div>

                    <div className="action-section">
                      <button
                        type="submit"
                        disabled={!isFormValid || loading}
                        className={`submit-button ${loading ? "loading" : ""}`}
                      >
                        {loading ? "Assigning..." : "➕ Assign Mentors"}
                      </button>

                      <div className="form-requirements">
                        <span className="requirement-text">* Required fields</span>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* VIEW TAB */}
            {activeTab === "view" && (
              <div className="tab-pane-mentorship active">
                <div className="form-section">
                  <div className="section-header">
                    <h3 className="section-title">Current Assignments</h3>
                    <button onClick={fetchAssignments} className="refresh-button">
                      🔄 Refresh
                    </button>
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Student Email</th>
                          <th>Mentor Name</th>
                          <th>Mentor Email</th>
                          <th>Assigned Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((assignment) => (
                          <tr key={assignment._id}>
                            <td>
                              {assignment.student ? (
                                `${assignment.student.name} ${assignment.student.surname}`
                              ) : (
                                <span className="not-found">Student not found</span>
                              )}
                            </td>
                            <td>{assignment.student?.email || 'N/A'}</td>
                            <td>
                              {assignment.mentor ? (
                                `${assignment.mentor.name} ${assignment.mentor.surname}`
                              ) : (
                                <span className="not-found">Mentor not found</span>
                              )}
                            </td>
                            <td>{assignment.mentor?.email || 'N/A'}</td>
                            <td>
                              {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td>
                              <button
                                onClick={() => handleDeleteAssignment(assignment._id)}
                                className="delete-button"
                                title="Delete assignment"
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {assignments.length === 0 && (
                      <div className="no-data-message">
                        No assignments found.
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
