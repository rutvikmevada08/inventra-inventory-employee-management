// Each module adds its entry here. `roles` omitted means every signed-in user; `section` entries are group headings.
export const navigation = [
  { to: '/', label: 'Dashboard', end: true },
  { section: 'Inventory' },
  { to: '/stock', label: 'Stock', roles: ['admin'] },
  { to: '/ledger', label: 'Stock ledger', roles: ['admin'] },
  { to: '/purchases', label: 'Purchases', roles: ['admin'] },
  { to: '/item-requests', label: 'Item requests' },
  { to: '/item-types', label: 'Item types', roles: ['admin'] },
  { section: 'Expenses' },
  { to: '/reimbursements', label: 'Reimbursements' },
  { to: '/fuel', label: 'Fuel' },
  { to: '/vehicles', label: 'Vehicles', roles: ['admin'] },
  { to: '/vendors', label: 'Vendors' },
  { section: 'Administration', roles: ['admin'] },
  { to: '/exports', label: 'Excel exports', roles: ['admin'] },
  { to: '/users', label: 'Users', roles: ['admin'] },
];
