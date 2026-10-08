// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { Login } from '../pages/Login';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { EmptyState, LoadingSpinner } from '../components/Feedback';

describe('Frontend Component & Role-Based UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Login screen renders email, password inputs and sign-in button', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Smart Inventory')).toBeDefined();
    expect(screen.getByPlaceholderText('e.g. admin@company.com')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter your password')).toBeDefined();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeDefined();
  });

  it('Navbar renders brand and sign-in link when unauthenticated', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Navbar onToggleSidebar={() => {}} />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Smart Inventory')).toBeDefined();
    expect(screen.getByText('Sign In')).toBeDefined();
  });

  it('Sidebar hides administrative modules (Payroll, Employees, Users) for non-admin users', () => {
    localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Staff Member', role: 'staff' }));
    localStorage.setItem('token', 'fake-jwt');

    render(
      <AuthProvider>
        <BrowserRouter>
          <Sidebar isOpen={true} onClose={() => {}} />
        </BrowserRouter>
      </AuthProvider>
    );

    // Common staff-accessible routes
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Stock Overview')).toBeDefined();
    expect(screen.getByText('Item Requests')).toBeDefined();
    expect(screen.getByText('Reimbursements')).toBeDefined();
    expect(screen.getByText('Fuel Purchases')).toBeDefined();

    // Admin-only sections must be hidden
    expect(screen.queryByText('Monthly Payroll')).toBeNull();
    expect(screen.queryByText('Daily Wages')).toBeNull();
    expect(screen.queryByText('User Management')).toBeNull();
    expect(screen.queryByText('Stock Ledger')).toBeNull();
  });

  it('Sidebar displays complete administrative modules when logged in as admin', () => {
    localStorage.setItem('user', JSON.stringify({ id: '2', name: 'System Admin', role: 'admin' }));
    localStorage.setItem('token', 'fake-jwt');

    render(
      <AuthProvider>
        <BrowserRouter>
          <Sidebar isOpen={true} onClose={() => {}} />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Employees')).toBeDefined();
    expect(screen.getByText('Attendance')).toBeDefined();
    expect(screen.getByText('Daily Wages')).toBeDefined();
    expect(screen.getByText('Monthly Payroll')).toBeDefined();
    expect(screen.getByText('Advances')).toBeDefined();
    expect(screen.getByText('Payments')).toBeDefined();
    expect(screen.getByText('Stock Ledger')).toBeDefined();
    expect(screen.getByText('Purchases & Lots')).toBeDefined();
    expect(screen.getByText('User Management')).toBeDefined();
  });

  it('LoadingSpinner and EmptyState render cleanly without emojis', () => {
    const { container: spinContainer } = render(<LoadingSpinner message="Checking stock ledger..." />);
    expect(screen.getByText('Checking stock ledger...')).toBeDefined();

    const { container: emptyContainer } = render(
      <EmptyState title="No items available" message="Warehouse is empty." />
    );
    expect(screen.getByText('No items available')).toBeDefined();
    expect(screen.getByText('Warehouse is empty.')).toBeDefined();

    // Verify no emojis in rendered feedback DOM
    expect(spinContainer.textContent).not.toMatch(/[\uD800-\uDBFF][\uDC00-\uDFFF]/);
    expect(emptyContainer.textContent).not.toMatch(/[\uD800-\uDBFF][\uDC00-\uDFFF]/);
  });
});
