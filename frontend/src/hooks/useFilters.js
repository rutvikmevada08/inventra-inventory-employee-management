import { useEffect, useMemo, useState } from 'react';
import useDebounce from './useDebounce';

// Filter state for list pages. Typing in "q" is debounced; changing any filter returns to page 1.
export default function useFilters(initial = {}) {
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(1);
  const q = useDebounce(filters.q);
  useEffect(() => setPage(1), [q]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const params = useMemo(() => {
    const p = { ...filters, q };
    Object.keys(p).forEach((k) => (p[k] === '' || p[k] === false || p[k] === undefined) && delete p[k]);
    return { ...p, page };
  }, [filters, q, page]);

  return { filters, set, page, setPage, params };
}
