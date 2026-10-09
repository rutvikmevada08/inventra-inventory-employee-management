import api from '../services/api';

// With responseType "blob" an error body arrives as a Blob too, so read it back into JSON for errorMessage().
async function readBlobError(err) {
  if (err.response?.data instanceof Blob) {
    try { err.response.data = JSON.parse(await err.response.data.text()); } catch { /* keep the original */ }
  }
  throw err;
}

export function saveBlob(blob, name) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export async function downloadFile(url, params, fallbackName) {
  const res = await api.get(url, { params, responseType: 'blob' }).catch(readBlobError);
  const name = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] || '')?.[1] || fallbackName;
  saveBlob(res.data, name);
}

// Invoices need the auth header, so they are fetched and opened from a temporary local URL.
export async function openFile(fileName) {
  const res = await api.get(`/files/${encodeURIComponent(fileName)}`, { responseType: 'blob' }).catch(readBlobError);
  const href = URL.createObjectURL(res.data);
  window.open(href, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(href), 60000);
}
