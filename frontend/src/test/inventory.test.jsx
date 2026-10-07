import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
vi.mock('../utils/download', () => ({ downloadFile: vi.fn().mockResolvedValue(), openFile: vi.fn().mockResolvedValue(), saveBlob: vi.fn() }));

import api, { tokenStore } from '../services/api';
import { downloadFile } from '../utils/download';
import { AuthProvider } from '../context/AuthContext';
import App from '../App';

const admin = { _id: 'u1', name: 'Anita Desai', role: 'admin' };
const staff = { _id: 'u2', name: 'Rakesh Patel', role: 'staff' };
const ok = (data, meta) => Promise.resolve({ data: { success: true, data, meta } });
const fail = (status, message) => Promise.reject({ response: { status, data: { success: false, message } } });
const page = (n) => ({ page: 1, limit: 20, total: n, pages: 1 });

const vendors = [{ _id: 'v1', name: 'Shree Ganesh Electricals' }, { _id: 'v2', name: 'Indian Oil - Alkapuri' }];
const itemTypes = [
  { _id: 't1', name: 'M8 Hex Bolts', unit: 'pcs', isStockable: true, reorderLevel: 50 },
  { _id: 't2', name: 'Office Rent', unit: 'pcs', isStockable: false },
];

// Responses by url; anything not listed answers 404 so a missing mock is obvious.
function mockApi(user, routes = {}) {
  tokenStore.set('t');
  const table = {
    '/auth/me': () => ok(user),
    '/dashboard/summary': () => ok({ role: 'staff', openItemRequests: 0, openReimbursements: 0 }),
    '/vendors': () => ok(vendors, page(2)),
    '/item-types': () => ok(itemTypes, page(2)),
    '/vehicles': () => ok([{ _id: 'c1', name: 'Mahindra Bolero', number: 'GJ 06 AB 1234' }], page(1)),
    '/users': () => ok([admin, staff], page(2)),
    ...routes,
  };
  api.get.mockImplementation((url, cfg) => (table[url] ? table[url](cfg) : fail(404, `not mocked: ${url}`)));
}
const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
const formBody = (call) => Object.fromEntries(call[1].entries());
const nav = () => within(screen.getByRole('navigation', { name: 'Main' }));

beforeEach(() => { vi.clearAllMocks(); });

describe('navigation and access', () => {
  test('admin sees every module; staff only the ones they can use', async () => {
    mockApi(admin);
    const { unmount } = renderAt('/');
    await screen.findByRole('heading', { name: 'Dashboard' });
    for (const name of ['Stock', 'Stock ledger', 'Purchases', 'Item requests', 'Item types', 'Reimbursements', 'Fuel', 'Vehicles', 'Vendors', 'Excel exports', 'Users']) {
      expect(nav().getByRole('link', { name })).toBeInTheDocument();
    }
    unmount();

    mockApi(staff);
    renderAt('/');
    await screen.findByRole('heading', { name: 'Dashboard' });
    for (const name of ['Item requests', 'Reimbursements', 'Fuel', 'Vendors']) expect(nav().getByRole('link', { name })).toBeInTheDocument();
    for (const name of ['Stock', 'Purchases', 'Users', 'Excel exports', 'Vehicles']) expect(nav().queryByRole('link', { name })).not.toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  test('staff who open an admin page are sent back to the dashboard', async () => {
    mockApi(staff);
    renderAt('/stock');
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/inventory', expect.anything());
  });
});

describe('new purchase form', () => {
  test('shows line totals, validates, and sends the data the API expects', async () => {
    mockApi(admin, { '/lots/new1': () => ok({ _id: 'new1', invoiceNumber: 'PH/118', vendor: { name: 'Shree Ganesh Electricals' }, items: [], payments: [], movements: [], balance: 0, totalPayable: 900, totalPaid: 0, paymentStatus: 'unpaid' }) });
    api.post.mockResolvedValue({ data: { success: true, data: { _id: 'new1' } } });
    renderAt('/purchases/new');
    await screen.findByRole('option', { name: 'Shree Ganesh Electricals' });
    await screen.findByRole('option', { name: 'M8 Hex Bolts' });

    await userEvent.click(screen.getByRole('button', { name: 'Save purchase' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a vendor');

    await userEvent.selectOptions(screen.getByLabelText(/^Vendor/), 'v1');
    await userEvent.click(screen.getByRole('button', { name: 'Save purchase' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the invoice number');

    await userEvent.type(screen.getByLabelText(/^Invoice number/), 'PH/118');
    await userEvent.click(screen.getByRole('button', { name: 'Save purchase' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add at least one item');
    expect(api.post).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText('Item type, line 1'), 't1');
    await userEvent.type(screen.getByLabelText('Quantity, line 1'), '200');
    await userEvent.type(screen.getByLabelText('Cost per unit, line 1'), '4.5');
    expect(screen.getByText('₹900.00')).toBeInTheDocument(); // line amount
    expect(screen.getByText('Items total: ₹900.00')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Goods have been received/));
    await userEvent.click(screen.getByRole('button', { name: 'Save purchase' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [url] = api.post.mock.calls[0];
    expect(url).toBe('/lots');
    const body = formBody(api.post.mock.calls[0]);
    expect(body.vendor).toBe('v1');
    expect(body.invoiceNumber).toBe('PH/118');
    expect(body.received).toBe('true');
    expect(body.totalPaid).toBe('0');
    expect(body.totalPayable).toBeUndefined(); // blank: the server uses the items total
    expect(JSON.parse(body.items)).toEqual([{ itemType: 't1', quantity: 200, costPerUnit: 4.5 }]);
    expect(await screen.findByRole('heading', { name: 'Invoice PH/118' })).toBeInTheDocument();
  });

  test('server rejections stay on the form', async () => {
    mockApi(admin);
    api.post.mockRejectedValue({ response: { status: 409, data: { message: 'A lot with this invoice number already exists for this vendor' } } });
    renderAt('/purchases/new');
    await screen.findByRole('option', { name: 'Shree Ganesh Electricals' });
    await userEvent.selectOptions(screen.getByLabelText(/^Vendor/), 'v1');
    await userEvent.type(screen.getByLabelText(/^Invoice number/), 'DUP-1');
    await screen.findByRole('option', { name: 'M8 Hex Bolts' });
    await userEvent.selectOptions(screen.getByLabelText('Item type, line 1'), 't1');
    await userEvent.type(screen.getByLabelText('Quantity, line 1'), '1');
    await userEvent.type(screen.getByLabelText('Cost per unit, line 1'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Save purchase' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('heading', { name: 'Add purchase' })).toBeInTheDocument();
  });
});

describe('purchase detail', () => {
  const lot = (over = {}) => ({
    _id: 'l1', invoiceNumber: 'SGE/221', vendor: { name: 'Shree Ganesh Electricals' }, purchaseDate: '2026-09-10', isActive: true, received: true, receivedAt: '2026-09-10',
    totalPayable: 5900, totalPaid: 2000, balance: 3900, paymentStatus: 'partial', lotType: 'Mechanical Hardware',
    items: [{ _id: 'i1', itemType: { _id: 't1', name: 'M8 Hex Bolts', unit: 'pcs', isStockable: true }, quantity: 1000, costPerUnit: 5.9, totalPayable: 5900 }],
    payments: [{ _id: 'p1', amount: 2000, date: '2026-09-10', method: 'UPI', reference: 'UTR 4455' }],
    movements: [{ _id: 'm1', itemType: 't1', type: 'in', quantity: 1000, date: '2026-09-10', source: 'lot' }], ...over,
  });

  test('shows the payment trail and records a payment, with a full-balance shortcut', async () => {
    mockApi(admin, { '/lots/l1': () => ok(lot()) });
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/purchases/l1');
    expect(await screen.findByRole('heading', { name: 'Invoice SGE/221' })).toBeInTheDocument();
    expect(screen.getByText('UTR 4455')).toBeInTheDocument();
    expect(screen.getByText('₹3,900.00', { selector: 'strong' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use full balance' }));
    expect(within(dialog).getByLabelText(/^Amount/)).toHaveValue(3900);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record payment' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/lots/l1/payments', expect.objectContaining({ amount: 3900, method: 'Bank transfer' })));
    expect(await screen.findByText('Payment recorded.')).toBeInTheDocument();
  });

  test('an over-payment is refused by the server and the message is shown in the dialog', async () => {
    mockApi(admin, { '/lots/l1': () => ok(lot()) });
    api.post.mockRejectedValue({ response: { status: 400, data: { message: 'Payment exceeds the outstanding balance of 3900' } } });
    renderAt('/purchases/l1');
    await userEvent.click(await screen.findByRole('button', { name: 'Record payment' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Amount/), '99999');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record payment' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('exceeds the outstanding balance');
  });

  test('a fully paid purchase offers no payment actions; a cancelled one says so', async () => {
    mockApi(admin, { '/lots/l1': () => ok(lot({ totalPaid: 5900, balance: 0, paymentStatus: 'paid' })) });
    const { unmount } = renderAt('/purchases/l1');
    await screen.findByRole('heading', { name: 'Invoice SGE/221' });
    expect(screen.queryByRole('button', { name: 'Record payment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as cleared' })).not.toBeInTheDocument();
    expect(screen.getByText(/cannot be cancelled/)).toBeInTheDocument();
    unmount();

    mockApi(admin, { '/lots/l1': () => ok(lot({ isActive: false })) });
    renderAt('/purchases/l1');
    expect(await screen.findByText(/This purchase was cancelled/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record payment' })).not.toBeInTheDocument();
  });

  test('mark as cleared asks first, then posts', async () => {
    mockApi(admin, { '/lots/l1': () => ok(lot()) });
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/purchases/l1');
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as cleared' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('₹3,900.00');
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as cleared' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/lots/l1/mark-clear', {}));
  });
});

describe('stock and ledger', () => {
  const stock = [
    { _id: 't1', name: 'M8 Hex Bolts', unit: 'pcs', balance: 40, reorderLevel: 50, lowStock: true, lastMovement: '2026-09-12' },
    { _id: 't3', name: 'Copper Cable', unit: 'm', balance: 120.5, reorderLevel: 10, lowStock: false, lastMovement: null },
  ];

  test('flags low stock and requires a reason for an adjustment', async () => {
    mockApi(admin, { '/inventory': () => ok(stock, { ...page(2), lowStockCount: 1 }) });
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/stock');
    expect(await screen.findByText('1 item(s) are at or below their reorder level.')).toBeInTheDocument();
    const row = screen.getByText('M8 Hex Bolts').closest('tr');
    expect(within(row).getByText('Low stock')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'History' })).toHaveAttribute('href', '/ledger?itemType=t1');

    await userEvent.click(within(row).getByRole('button', { name: 'Adjust' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Quantity/), '5');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record adjustment' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('A reason is required');
    expect(api.post).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/^Reason/), 'Damaged in storage');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Record adjustment' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/inventory/adjustments', { itemType: 't1', direction: 'out', quantity: 5, reason: 'Damaged in storage' }));
  });

  test('the low-stock filter is sent to the API', async () => {
    mockApi(admin, { '/inventory': () => ok(stock, { ...page(2), lowStockCount: 1 }) });
    renderAt('/stock');
    await screen.findByText('Copper Cable');
    await userEvent.click(screen.getByLabelText('Low stock only'));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/inventory', { params: expect.objectContaining({ lowStock: true }) })); // axios sends it as lowStock=true
  });

  test('the ledger opens already filtered when linked from a stock row, and labels each source', async () => {
    mockApi(admin, {
      '/inventory/transactions': () => ok([
        { _id: 'x1', date: '2026-09-10', itemType: { name: 'M8 Hex Bolts', unit: 'pcs' }, type: 'in', quantity: 1000, source: 'lot', note: 'Received against invoice SGE/221', createdBy: { name: 'Anita Desai' } },
        { _id: 'x2', date: '2026-09-12', itemType: { name: 'M8 Hex Bolts', unit: 'pcs' }, type: 'out', quantity: 20, source: 'adjustment', note: 'Damaged', createdBy: { name: 'Anita Desai' } },
      ], page(2)),
    });
    renderAt('/ledger?itemType=t1');
    await screen.findByText('Received against invoice SGE/221');
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Purchase received')).toBeInTheDocument();
    expect(table.getByText('Manual adjustment')).toBeInTheDocument();
    expect(screen.getByText('-20 pcs')).toBeInTheDocument();
    expect(screen.getByText('+1,000 pcs')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/inventory/transactions', { params: expect.objectContaining({ itemType: 't1' }) });
  });
});

describe('item requests', () => {
  const requests = [
    { _id: 'r1', date: '2026-09-20', requestedBy: { name: 'Rakesh Patel' }, itemType: { name: 'M8 Hex Bolts', unit: 'pcs', isStockable: true }, quantity: 30, reason: 'Fixture build', status: 'requested' },
    { _id: 'r2', date: '2026-09-18', requestedBy: { name: 'Rakesh Patel' }, itemType: { name: 'Office Rent', unit: 'pcs', isStockable: false }, quantity: 1, reason: 'Storage', status: 'rejected', rejectionReason: 'Use existing space', decidedBy: { name: 'Anita Desai' }, decidedAt: '2026-09-19' },
  ];

  test('admin approval explains the stock effect and shows the server message when stock is short', async () => {
    mockApi(admin, { '/item-requests': () => ok(requests, page(2)) });
    api.post.mockRejectedValue({ response: { status: 409, data: { message: 'Insufficient stock. Available: 10, requested: 30' } } });
    renderAt('/item-requests');
    const row = (await screen.findByText('Fixture build')).closest('tr');
    await userEvent.click(within(row).getByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('issued from stock now');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient stock');
    expect(api.post).toHaveBeenCalledWith('/item-requests/r1/approve', {});
    expect(screen.getByText(/Use existing space/)).toBeInTheDocument();
  });

  test('rejecting sends the reason', async () => {
    mockApi(admin, { '/item-requests': () => ok(requests, page(2)) });
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/item-requests');
    const row = (await screen.findByText('Fixture build')).closest('tr');
    await userEvent.click(within(row).getByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Reason/), 'Not in budget');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/item-requests/r1/reject', { reason: 'Not in budget' }));
  });

  test('staff can raise a request but cannot decide any', async () => {
    mockApi(staff, { '/item-requests': () => ok(requests, page(2)) });
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/item-requests');
    await screen.findByText('Fixture build');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByText('Requested by')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'New request' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit request' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Choose an item');
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Item/), 't1');
    await userEvent.type(within(dialog).getByLabelText(/^Quantity/), '12');
    await userEvent.type(within(dialog).getByLabelText(/^Needed for/), 'Workshop bay 2');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit request' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/item-requests', { itemType: 't1', quantity: 12, reason: 'Workshop bay 2' }));
  });
});

describe('reimbursements', () => {
  const claims = [
    { _id: 'c1', date: '2026-09-20', claimant: { name: 'Rakesh Patel' }, spentOn: 'Auto fare', amount: 640, status: 'requested' },
    { _id: 'c2', date: '2026-09-21', claimant: { name: 'Meena Joshi' }, spentOn: 'Printouts', vendorName: 'Copy Point', invoiceNumber: 'CP-12', amount: 300, status: 'approved' },
    { _id: 'c3', date: '2026-09-22', claimant: { name: 'Meena Joshi' }, spentOn: 'Courier', amount: 150, status: 'paid', paidAt: '2026-09-25', paymentMethod: 'UPI' },
  ];
  const summary = { requested: { amount: 640, count: 1 }, approved: { amount: 300, count: 1 }, paid: { amount: 150, count: 1 }, rejected: { amount: 0, count: 0 } };
  const routes = { '/reimbursements': () => ok(claims, page(3)), '/reimbursements/summary': () => ok(summary) };

  test('totals per stage, and the action offered depends on the status', async () => {
    mockApi(admin, routes);
    renderAt('/reimbursements');
    expect(await screen.findByText('Awaiting decision')).toBeInTheDocument();
    expect(screen.getByText('₹640.00', { selector: '.value' })).toBeInTheDocument();
    const requested = screen.getByText('Auto fare').closest('tr');
    expect(within(requested).getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(within(requested).queryByRole('button', { name: 'Mark as paid' })).not.toBeInTheDocument();
    const approved = screen.getByText('Printouts').closest('tr');
    expect(within(approved).getByRole('button', { name: 'Mark as paid' })).toBeInTheDocument();
    const paid = screen.getByText('Courier').closest('tr');
    expect(within(paid).queryByRole('button')).toBeNull();
  });

  test('marking as paid records the method and reference', async () => {
    mockApi(admin, routes);
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/reimbursements');
    const row = (await screen.findByText('Printouts')).closest('tr');
    await userEvent.click(within(row).getByRole('button', { name: 'Mark as paid' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Reference/), 'UTR 9921');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as paid' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/reimbursements/c2/pay', expect.objectContaining({ paymentMethod: 'Bank transfer', paymentReference: 'UTR 9921' })));
    expect(await screen.findByText('Marked as paid.')).toBeInTheDocument();
  });

  test('staff submit a claim as multipart form data and never see the approval buttons', async () => {
    mockApi(staff, routes);
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/reimbursements');
    await screen.findByText('Auto fare');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/users', expect.anything());
    await userEvent.click(screen.getByRole('button', { name: 'New reimbursement' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByLabelText(/On behalf of/)).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/^What was it for/), 'Tea for audit visit');
    await userEvent.type(within(dialog).getByLabelText(/^Amount/), '1250.5');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit request' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const body = formBody(api.post.mock.calls[0]);
    expect(api.post.mock.calls[0][0]).toBe('/reimbursements');
    expect(body.spentOn).toBe('Tea for audit visit');
    expect(body.amount).toBe('1250.5');
    expect(body.status).toBeUndefined();
  });
});

describe('fuel', () => {
  test('total is calculated from litres and rate, and the entry is sent with the right fields', async () => {
    mockApi(staff, { '/fuel': () => ok([], { ...page(0), totalLitres: 0, totalAmount: 0 }) });
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/fuel');
    expect(await screen.findByText('No fuel entries match these filters.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Log fuel' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Vehicle/), 'c1');
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Fuel station/), 'v2');
    await userEvent.type(within(dialog).getByLabelText(/^Litres/), '32.5');
    await userEvent.type(within(dialog).getByLabelText(/^Rate per litre/), '94.72');
    expect(within(dialog).getByText('Total: ₹3,078.40')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/^Bill number/), 'IOC-77123');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const body = formBody(api.post.mock.calls[0]);
    expect(body).toMatchObject({ vehicle: 'c1', vendor: 'v2', litres: '32.5', costPerLitre: '94.72', invoiceNumber: 'IOC-77123' });
    expect(body.total).toBeUndefined(); // the server calculates it
    expect(body.fueledBy).toBeUndefined();
  });

  test('shows the totals for the current filters', async () => {
    mockApi(admin, { '/fuel': () => ok([], { ...page(0), totalLitres: 42.5, totalAmount: 4028.4 }) });
    renderAt('/fuel');
    expect(await screen.findByText('₹4,028.40')).toBeInTheDocument();
    expect(screen.getByText('42.5')).toBeInTheDocument();
  });
});

describe('item types, users and exports', () => {
  test('item types: a service is added with stock tracking off', async () => {
    mockApi(admin, { '/item-types': () => ok(itemTypes, page(2)) });
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/item-types');
    expect(await screen.findByText('No (service)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add item type' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^Name/), 'Annual Software Renewal');
    await userEvent.click(within(dialog).getByLabelText(/Track in stock/));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/item-types', { name: 'Annual Software Renewal', unit: 'pcs', reorderLevel: 0, isStockable: false }));
  });

  test('users: an administrator can reset someone else\'s password', async () => {
    mockApi(admin, { '/users': () => ok([{ ...staff, email: 'rakesh@example.com', loginEnabled: true, isActive: true }], page(1)) });
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/users');
    await userEvent.click(await screen.findByRole('button', { name: 'Reset password' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/^New password/), 'NewPass#2026');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset password' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/users/u2/reset-password', { password: 'NewPass#2026' }));
    expect(await screen.findByText('Password reset for Rakesh Patel.')).toBeInTheDocument();
  });

  test('exports: checks the dates, then downloads with the chosen range', async () => {
    mockApi(admin);
    renderAt('/exports');
    await screen.findByRole('heading', { name: 'Excel exports' });
    const panel = screen.getByRole('heading', { name: 'Investor sheet' }).closest('section');
    const from = within(panel).getByLabelText('From');
    await userEvent.clear(from);
    await userEvent.type(from, '2026-09-01');
    const to = within(panel).getByLabelText('To');
    await userEvent.clear(to);
    await userEvent.type(to, '2026-08-01');
    await userEvent.click(within(panel).getByRole('button', { name: 'Download Excel file' }));
    expect(await within(panel).findByRole('alert')).toHaveTextContent('from date must be on or before');
    expect(downloadFile).not.toHaveBeenCalled();

    await userEvent.clear(to);
    await userEvent.type(to, '2026-09-30');
    await userEvent.click(within(panel).getByRole('button', { name: 'Download Excel file' }));
    await waitFor(() => expect(downloadFile).toHaveBeenCalledWith('/exports/investor-sheet', { from: '2026-09-01', to: '2026-09-30' }, 'Investor_sheet.xlsx'));
  });
});
