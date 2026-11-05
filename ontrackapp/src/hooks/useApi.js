import { useState, useEffect, useCallback, useRef } from 'react';
import { axiosWithRetry } from '../services/apiService';

// API responses remain in component memory and are discarded on unmount.
const useApi = (url, options = {}) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const optionsRef = useRef(options);
  const optionsString = JSON.stringify(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!url) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000);
    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const axiosConfig = {
          ...optionsRef.current,
          url,
          method: optionsRef.current.method || 'GET',
          signal: controller.signal,
        };
        const data = await axiosWithRetry(axiosConfig, optionsRef.current.retries || 3);
        if (active) setResult({ url, data });
      } catch (err) {
        if (!active) return;
        setResult(null);
        if (controller.signal.aborted || err.name === 'AbortError') setError('Request timeout');
        else if (err.response) setError(`Server error: ${err.response.status}`);
        else if (err.request) setError('Network error - please check your connection');
        else setError('An unexpected error occurred');
      } finally {
        if (active) setLoading(false);
        clearTimeout(timeoutId);
      }
    };
    fetchData();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [url, optionsString, revision]);

  const refetch = useCallback(() => {
    setError(null);
    setLoading(true);
    setRevision(value => value + 1);
  }, []);

  return { data: url && result?.url === url ? result.data : null, loading: Boolean(url) && loading, error: url ? error : null, refetch };
};

const useDashboardApi = endpoint => {
  const result = useApi(endpoint ? `/api${endpoint}` : null, { retries: 2 });
  return { ...result, isFromCache: false };
};

const usePublicApi = endpoint => {
  const result = useApi(endpoint ? `/api${endpoint}` : null);
  return { ...result, isFromCache: false };
};

export { useApi, useDashboardApi, usePublicApi };
export default useApi;
