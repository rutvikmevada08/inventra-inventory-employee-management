import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { navigation } from './navigation';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const allowed = navigation.filter((n) => !n.roles || n.roles.includes(user.role));
  // A group heading is only shown when at least one link follows it.
  const items = allowed.filter((n, i) => !n.section || (allowed[i + 1] && !allowed[i + 1].section));
  const current = items.find((n) => n.to && (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  return (
    <div className="app">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">Smart Inventory &amp; Workforce Management</div>
        <nav className="sidebar-nav" aria-label="Main">
          {items.map((n) => (n.section
            ? <div key={n.section} className="nav-section">{n.section}</div>
            : <NavLink key={n.to} to={n.to} end={n.end} className="nav-link" onClick={() => setOpen(false)}>{n.label}</NavLink>))}
        </nav>
        <div className="sidebar-user">
          <div className="name">{user.name}</div>
          <div className="muted">{user.role === 'admin' ? 'Administrator' : 'Staff'}</div>
          <button type="button" className="btn btn-link" onClick={logout}>Sign out</button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button type="button" className="btn btn-small" aria-label="Open menu" onClick={() => setOpen(true)}>Menu</button>
          <span className="title">{current?.label || 'Smart Inventory'}</span>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
