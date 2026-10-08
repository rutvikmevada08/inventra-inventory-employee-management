import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();

  return (
    <aside className={`app-sidebar ${isOpen ? "open" : ""}`}>
      <nav className="sidebar-nav">
        <div className="nav-group">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            Dashboard
          </NavLink>
        </div>

        {isAdmin && (
          <div className="nav-group">
            <div className="nav-group-title">WORKFORCE</div>
            <NavLink
              to="/employees"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              Employees
            </NavLink>
            <NavLink
              to="/attendance"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              Attendance
            </NavLink>
            <NavLink
              to="/daily-wages"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              Daily Wages
            </NavLink>
            <NavLink
              to="/payroll"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              Monthly Payroll
            </NavLink>
            <NavLink
              to="/advances"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              Advances
            </NavLink>
            <NavLink
              to="/payments"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              Payments
            </NavLink>
          </div>
        )}

        <div className="nav-group">
          <div className="nav-group-title">INVENTORY</div>
          <NavLink
            to="/stock"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            Stock Overview
          </NavLink>
          {isAdmin && (
            <>
              <NavLink
                to="/stock-ledger"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={onClose}
              >
                Stock Ledger
              </NavLink>
              <NavLink
                to="/purchases"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={onClose}
              >
                Purchases & Lots
              </NavLink>
              <NavLink
                to="/item-types"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={onClose}
              >
                Item Types
              </NavLink>
            </>
          )}
          <NavLink
            to="/item-requests"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            Item Requests
          </NavLink>
        </div>

        <div className="nav-group">
          <div className="nav-group-title">OPERATIONS</div>
          <NavLink
            to="/vendors"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            Vendors
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/vehicles"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              Vehicles
            </NavLink>
          )}
          <NavLink
            to="/fuel"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            Fuel Purchases
          </NavLink>
          <NavLink
            to="/reimbursements"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            Reimbursements
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/expenses"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              Expenses
            </NavLink>
          )}
        </div>

        <div className="nav-group">
          <div className="nav-group-title">ANALYTICS & SYSTEM</div>
          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            Reports & Exports
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              User Management
            </NavLink>
          )}
        </div>
      </nav>
    </aside>
  );
};
