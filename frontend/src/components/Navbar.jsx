import React from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button className="sidebar-toggle-btn" onClick={onToggleSidebar} aria-label="Toggle Navigation">
          ☰
        </button>
        <Link to="/" className="navbar-brand">
          <span className="brand-primary">Smart Inventory</span>
          <span className="brand-sub"> & Workforce</span>
        </Link>
      </div>

      <div className="navbar-right">
        {user ? (
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className={`user-role-badge badge-${user.role}`}>{user.role.toUpperCase()}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              Sign Out
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary btn-sm">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
