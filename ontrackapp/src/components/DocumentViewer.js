import React from 'react';
import DocumentDownloadButton from './DocumentDownloadButton';
import './DocumentViewer.css';

export default function DocumentViewer({ url, onClose }) {
  if (!url) return null;
  return <div role="dialog" aria-modal="true" aria-label="Document" className="document-viewer">
    <div className="document-viewer__panel">
      <h3>Document</h3>
      <p>Download this document to open it.</p>
      <div className="document-viewer__actions">
        <DocumentDownloadButton url={url} />
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  </div>;
}
