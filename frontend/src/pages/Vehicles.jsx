import SimpleCrudPage from '../components/SimpleCrudPage';

const config = {
  title: 'Vehicles',
  subtitle: 'Vehicles that are refuelled',
  noun: 'Vehicle',
  endpoint: '/vehicles',
  searchPlaceholder: 'Search by name or number',
  fields: [
    { key: 'name', label: 'Vehicle name', required: true, full: true },
    { key: 'number', label: 'Registration number', required: true, hint: 'For example GJ 06 AB 1234' },
    { key: 'notes', label: 'Notes', full: true },
  ],
  columns: [
    { key: 'name', header: 'Vehicle' },
    { key: 'number', header: 'Registration number' },
    { key: 'notes', header: 'Notes' },
  ],
};

export default function Vehicles() {
  return <SimpleCrudPage config={config} />;
}
