const TONES = {
  requested: 'warning', pending: 'warning', unpaid: 'warning', partial: 'warning',
  approved: 'info', received: 'info',
  paid: 'success', active: 'success',
  rejected: 'danger', inactive: 'danger', cancelled: 'danger',
};

export default function Badge({ status, tone, children }) {
  const t = tone || TONES[String(status).toLowerCase()];
  return <span className={`badge${t ? ` badge-${t}` : ''}`}>{children ?? status}</span>;
}
