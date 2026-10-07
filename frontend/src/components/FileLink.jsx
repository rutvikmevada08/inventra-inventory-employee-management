import { useState } from 'react';
import { openFile } from '../utils/download';

export default function FileLink({ file, label = 'View invoice' }) {
  const [missing, setMissing] = useState(false);
  if (!file) return <span className="muted">-</span>;
  if (missing) return <span className="muted">File not found</span>;
  return <button type="button" className="btn btn-link" onClick={() => openFile(file).catch(() => setMissing(true))}>{label}</button>;
}
