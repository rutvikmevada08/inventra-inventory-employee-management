import { useCallback, useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../services/api';

// Loads a list or record from the API. Re-runs when the url or params change; call reload() after a save.
export default function useFetch(url, params, { skip = false } = {}) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const key = JSON.stringify(params || {});
  const counter = useRef(0);

  const load = useCallback(() => {
    if (skip) return setState({ data: null, meta: null, loading: false, error: null });
    const request = ++counter.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get(url, { params: JSON.parse(key) })
      .then((res) => request === counter.current && setState({ data: res.data.data, meta: res.data.meta || null, loading: false, error: null }))
      .catch((err) => request === counter.current && setState({ data: null, meta: null, loading: false, error: errorMessage(err) }));
  }, [url, key, skip]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
