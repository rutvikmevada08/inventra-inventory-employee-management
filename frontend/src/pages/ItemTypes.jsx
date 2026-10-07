import SimpleCrudPage from '../components/SimpleCrudPage';
import { formatQty } from '../utils/format';

const config = {
  title: 'Item types',
  subtitle: 'Goods and services that appear on purchases and requests',
  noun: 'Item type',
  endpoint: '/item-types',
  searchPlaceholder: 'Search item types',
  fields: [
    { key: 'name', label: 'Name', required: true, full: true },
    { key: 'unit', label: 'Unit', default: 'pcs', hint: 'For example pcs, kg, litres, m' },
    { key: 'reorderLevel', label: 'Reorder level', type: 'number', default: 0, hint: 'Flagged as low stock at or below this quantity. 0 turns the warning off.' },
    { key: 'isStockable', label: 'Track in stock', type: 'checkbox', default: true, hint: '(turn off for services such as rent, bills or renewals)' },
  ],
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'unit', header: 'Unit' },
    { key: 'reorderLevel', header: 'Reorder level', align: 'num', render: (r) => (r.isStockable === false ? '-' : formatQty(r.reorderLevel)) },
    { key: 'isStockable', header: 'Tracked in stock', render: (r) => (r.isStockable === false ? 'No (service)' : 'Yes') },
  ],
};

export default function ItemTypes() {
  return <SimpleCrudPage config={config} />;
}
