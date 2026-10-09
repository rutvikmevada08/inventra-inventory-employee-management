import { useState } from 'react';
import { errorMessage } from '../services/api';

// Runs a request, tracks "busy", and turns success or failure into a notice for the page to show.
export default function useAction() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const run = async (fn, successMessage) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await fn();
      if (successMessage) setNotice({ tone: 'success', text: successMessage });
      return { ok: true, result };
    } catch (err) {
      setNotice({ tone: 'danger', text: errorMessage(err) });
      return { ok: false, error: err };
    } finally {
      setBusy(false);
    }
  };
  return { busy, notice, setNotice, run };
}
