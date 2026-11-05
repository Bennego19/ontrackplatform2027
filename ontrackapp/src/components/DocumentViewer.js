import React from 'react';
import DocumentDownloadButton from './DocumentDownloadButton';

export default function DocumentViewer({ url, onClose }) {
  if (!url) return null;
  return <div role="dialog" aria-modal="true" aria-label="Document" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    <div style={{ background: '#fff', borderRadius: 12, padding: 24 }}>
      <h3>Document</h3>
      <p>Download this document to open it.</p>
      <DocumentDownloadButton url={url} />{' '}
      <button type="button" onClick={onClose}>Close</button>
    </div>
  </div>;
}
