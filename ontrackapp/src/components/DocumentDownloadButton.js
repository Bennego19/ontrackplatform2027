import React, { useState } from 'react';
import { downloadDocument } from '../services/documentDownload';

export default function DocumentDownloadButton({ url, children = 'Download document' }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    setError('');
    try { await downloadDocument(url); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };
  return <span><button type="button" onClick={download} disabled={loading}>{loading ? 'Downloading…' : children}</button>{error && <span role="alert"> {error}</span>}</span>;
}
