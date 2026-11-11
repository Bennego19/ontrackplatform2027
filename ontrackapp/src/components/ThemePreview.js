import React from 'react';
import { Link } from 'react-router-dom';

const ThemePreview = () => (
  <main className="ui-preview">
    <header className="ui-preview-header">
      <h1>OnTrack Connect</h1>
      <p>Shared component color scheme preview</p>
    </header>

    <div className="ui-preview-grid">
      <section className="ui-preview-card">
        <h2>Dashboard metric</h2>
        <div className="ui-preview-kpi">
          <span>Total Students</span>
          <strong>128</strong>
        </div>
      </section>

      <section className="ui-preview-card">
        <h2>Actions</h2>
        <div className="ui-preview-actions">
          <button className="ui-preview-primary" type="button">Primary action</button>
          <button className="ui-preview-secondary" type="button">Secondary action</button>
        </div>
      </section>

      <section className="ui-preview-card ui-preview-form">
        <h2>Form field</h2>
        <label htmlFor="theme-preview-input">Program name</label>
        <input id="theme-preview-input" placeholder="Enter a program name" />
      </section>

      <section className="ui-preview-card">
        <h2>Data table</h2>
        <table className="ui-preview-table">
          <thead>
            <tr><th>Program</th><th>Students</th></tr>
          </thead>
          <tbody>
            <tr><td>Mentorship</td><td>38</td></tr>
            <tr><td>Internship</td><td>42</td></tr>
          </tbody>
        </table>
      </section>
    </div>

    <nav className="ui-preview-links" aria-label="Dashboard previews">
      <Link to="/dashboard-preview">Open dashboard preview</Link>
      <Link to="/">Return to login</Link>
    </nav>
  </main>
);

export default ThemePreview;
