import React, { useEffect, useState } from "react";
import axios from "axios";
import { tokenManager } from '../services/authMiddleware';
import "./StudentAssignment.css"; // We'll create this CSS file

export default function StudentAssignment() {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [formData, setFormData] = useState({
    student: "",
    program: "",
    track: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await fetchStudents();
      // Set hardcoded programs and tracks
      setPrograms([
        { _id: "1", name: "Mentorship Program" },
        { _id: "2", name: "Internship Program" },
        { _id: "3", name: "Skill Development Program" },
      ]);
      setTracks([
        { _id: "1", name: "Web Development" },
        { _id: "2", name: "Java Programming" },
        { _id: "3", name: "C# Programming" },
        { _id: "4", name: "Python Programming" },
        { _id: "5", name: "Robotics" },
        { _id: "6", name: "Compukids" },
        { _id: "7", name: "CompuTeens" },
        { _id: "8", name: "Digital Entrepreneurship" },
      ]);
    } catch (error) {
      showMessage("Failed to load data. Please refresh the page.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get("/api/onboardstudents/");
      setStudents(res.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };





  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const assignStudent = async () => {
    if (!formData.student) {
      showMessage("Please select a student.", "error");
      return;
    }

    // Get selected student details
    const selectedStudent = students.find(s => s._id === formData.student);
    if (!selectedStudent) {
      showMessage("Selected student not found.", "error");
      return;
    }

    setLoading(true);
    try {
      // Update student with program and track information
      await axios.patch(`/api/onboardstudents/${formData.student}`, {
        program: formData.program,
        track: formData.track
      }, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      showMessage("🎉 Student successfully assigned to program and track!");

      // Clear form
      setFormData({
        student: "",
        program: "",
        track: ""
      });

    } catch (error) {
      console.error(error);
      showMessage("❌ Failed to assign student. Please try again.", "error");
    }
    setLoading(false);
  };

  const isFormValid = formData.student;

  return (
    <div className="assignment-container">
      <div className="assignment-card">
        <div className="assignment-header">
          <h1 className="assignment-title">Assign Student to Program</h1>
          <p className="assignment-subtitle">Assign students to programs and tracks</p>
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        )}

        <div className="form-grid">
          {/* Student and Program Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Select Student</label>
               <select
              className="form-select"
              value={formData.student}
              onChange={(e) => handleInputChange("student", e.target.value)}
              disabled={loading}
            >
                <option value="">-- Choose Student --</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} {student.surname} {student.email ? `(${student.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select Program *</label>
              <select
                className="form-select"
                value={formData.program}
                onChange={(e) => handleInputChange("program", e.target.value)}
                disabled={loading}
              >
                <option value="">-- Choose Program --</option>
                {programs.map((program) => (
                  <option key={program._id} value={program.name}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Track Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Select Track</label>
              <select
                className="form-select"
                value={formData.track}
                onChange={(e) => handleInputChange("track", e.target.value)}
                disabled={loading}
              >
                <option value="">-- Select Track --</option>
                {tracks.map((track) => (
                  <option key={track._id} value={track.name}>
                    {track.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="action-section">
          <button
            onClick={assignStudent}
            disabled={loading || !isFormValid}
            className={`assign-button ${loading ? 'loading' : ''} ${!isFormValid ? 'disabled' : ''}`}
          >
            {loading ? (
              <>
                <span className="button-spinner"></span>
                Assigning...
              </>
            ) : (
              'Assign Student'
            )}
          </button>

          <div className="form-requirements">
            <span className="requirement-text">* Required fields</span>
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}