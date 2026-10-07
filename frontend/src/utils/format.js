const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });

export const formatMoney = (n) => (n === null || n === undefined ? '-' : inr.format(n));
export const formatQty = (n) => (n === null || n === undefined ? '-' : qty.format(n));

export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const titleCase = (s = '') => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
