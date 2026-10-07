import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return { ...actual, default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

import api, { tokenStore } from '../services/api';
import { AuthProvider } from '../context/AuthContext';
import App from '../App';

const admin = { _id: 'u1', name: 'Anita Desai', role: 'admin', email: 'anita@example.com' };
const staff = { _id: 'u2', name: 'Rakesh Patel', role: 'staff', email: 'rakesh@example.com' };
const ok = (data, meta) => Promise.resolve({ data: { success: true, data, meta } });
const adminSummary = { role: 'admin', stockItemCount: 12, lowStockCount: 2, lowStock: [{ _id: 'i1', name: 'M8 Hex Bolts', unit: 'pcs', balance: 40, reorderLevel: 50 }], pendingItemRequests: 3, pendingReimbursements: 1, vendorCount: 4, outstandingToVendors: 15400, fuelThisMonth: { amount: 4028.4, litres: 42.5 }, recentMovements: [] };
const vendors = [
  { _id: 'v1', name: 'Shree Ganesh Electricals', contactPerson: 'Dilip Shah', phone: '9825012345', email: 'sales@ganesh.example', isActive: true },
  { _id: 'v2', name: 'Patel Hardware Mart', isActive: true },
];
const page = { page: 1, limit: 20, total: 2, pages: 1 };

function mockApi(user, extra = {}) {
  api.get.mockImplementation((url) => {
    if (url in extra) return extra[url]();
    if (url === '/auth/me') return ok(user);
    if (url === '/dashboard/summary') return ok(user.role === 'admin' ? adminSummary : { role: 'staff', openItemRequests: 1, openReimbursements: 2 });
    if (url === '/vendors') return ok(vendors, page);
    return Promise.reject({ response: { status: 404, data: { message: 'not mocked' } } });
  });
}

const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());

describe('authentication', () => {
  test('visitors are sent to the sign-in page', async () => {
    renderAt('/vendors');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  test('wrong credentials show the server message and store no token', async () => {
    api.post.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password' } } });
    renderAt('/');
    await userEvent.type(screen.getByLabelText('Email'), 'anita@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(tokenStore.get()).toBeNull();
  });

  test('successful sign-in stores the token and opens the dashboard', async () => {
    mockApi(admin);
    api.post.mockResolvedValue({ data: { success: true, data: { token: 'jwt-token', user: admin } } });
    renderAt('/');
    await userEvent.type(screen.getByLabelText('Email'), 'anita@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Admin#2026demo');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'anita@example.com', password: 'Admin#2026demo' });
    expect(tokenStore.get()).toBe('jwt-token');
    expect(await screen.findByText('M8 Hex Bolts')).toBeInTheDocument();
  });

  test('an existing token restores the session, and signing out clears it', async () => {
    tokenStore.set('old-token');
    mockApi(admin);
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });
});

describe('dashboard', () => {
  test('admin sees stock and money figures; low stock is highlighted', async () => {
    tokenStore.set('t');
    mockApi(admin);
    renderAt('/');
    expect(await screen.findByText('Low stock items')).toBeInTheDocument();
    expect(screen.getByText('₹15,400.00')).toBeInTheDocument();
    expect(screen.getByText('42.5 litres')).toBeInTheDocument();
  });

  test('staff see only their own open items', async () => {
    tokenStore.set('t');
    mockApi(staff);
    renderAt('/');
    expect(await screen.findByText('Open item requests')).toBeInTheDocument();
    expect(screen.queryByText('Owed to vendors')).not.toBeInTheDocument();
  });
});

describe('vendors', () => {
  beforeEach(() => tokenStore.set('t'));

  test('admin can add a vendor and the list reloads', async () => {
    mockApi(admin);
    api.post.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/vendors');
    expect(await screen.findByText('Patel Hardware Mart')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add vendor' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Vendor name/), 'Sai Auto Spares');
    await userEvent.type(within(dialog).getByLabelText('Phone'), '9879012345');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save vendor' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/vendors', expect.objectContaining({ name: 'Sai Auto Spares', phone: '9879012345' })));
    expect(await screen.findByText('Vendor added.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('a blank name is caught before sending; server errors are shown on the form', async () => {
    mockApi(admin);
    renderAt('/vendors');
    await screen.findByText('Patel Hardware Mart');
    await userEvent.click(screen.getByRole('button', { name: 'Add vendor' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save vendor' }));
    expect(await within(dialog).findByText('Vendor name is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    api.post.mockRejectedValue({ response: { status: 409, data: { message: 'A vendor with this name already exists' } } });
    await userEvent.type(within(dialog).getByLabelText(/Vendor name/), 'Patel Hardware Mart');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save vendor' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // form stays open so nothing is lost
  });

  test('deactivating asks for confirmation first', async () => {
    mockApi(admin);
    api.delete.mockResolvedValue({ data: { success: true, data: {} } });
    renderAt('/vendors');
    const row = (await screen.findByText('Patel Hardware Mart')).closest('tr');
    await userEvent.click(within(row).getByRole('button', { name: 'Deactivate' }));
    expect(api.delete).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Existing purchases and payments are kept');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/vendors/v2'));
    expect(await screen.findByText('Patel Hardware Mart deactivated.')).toBeInTheDocument();
  });

  test('staff can look up vendors but see no add, edit or deactivate controls', async () => {
    mockApi(staff);
    renderAt('/vendors');
    expect(await screen.findByText('Patel Hardware Mart')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add vendor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  test('an empty search result explains itself', async () => {
    mockApi(admin, { '/vendors': () => ok([], { page: 1, limit: 20, total: 0, pages: 1 }) });
    renderAt('/vendors');
    expect(await screen.findByText('No vendors have been added yet.')).toBeInTheDocument();
  });

  test('a failed load shows the error', async () => {
    mockApi(admin, { '/vendors': () => Promise.reject({ response: { status: 500, data: { message: 'Database unavailable' } } }) });
    renderAt('/vendors');
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
  });
});
