import React, { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";

export const Stock = () => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchStock = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/inventory/stock");
      setStock(res.data.stock || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load inventory stock.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const filtered = stock.filter((s) => {
    if (!search) return true;
    const name = s.itemType?.Type_name || "";
    const cat = s.itemType?.category || "";
    return name.toLowerCase().includes(search.toLowerCase()) || cat.toLowerCase().includes(search.toLowerCase());
  });

  const totalQuantity = stock.reduce((sum, s) => sum + (s.currentStock || 0), 0);
  const totalValue = stock.reduce((sum, s) => sum + (s.totalValue || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Stock Overview</h1>
          <p className="page-desc">
            Live stock balances derived mathematically from immutable transaction ledgers (Purchases &ndash; Issues).
          </p>
        </div>
        <div className="header-actions">
          <Link to="/stock-ledger" className="btn btn-secondary btn-sm">
            View Audit Ledger &rarr;
          </Link>
          <Link to="/purchases" className="btn btn-primary btn-sm">
            + Purchase Stock
          </Link>
        </div>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError("")} />

      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Tracked Item Types</div>
          <div className="metric-value">{stock.length}</div>
          <div className="metric-sub">Catalog hardware items</div>
        </div>
        <div className="metric-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="metric-label">Total Units On Hand</div>
          <div className="metric-value" style={{ color: "var(--primary)" }}>{totalQuantity}</div>
          <div className="metric-sub">Net available in storage</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Estimated Valuation</div>
          <div className="metric-value">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div className="metric-sub">Calculated from purchase lots</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="form-control"
          placeholder="Filter item name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "280px" }}
        />
        <div style={{ marginLeft: "auto", fontSize: "13px", color: "var(--text-muted)" }}>
          Showing {filtered.length} of {stock.length} items
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating stock balances from ledger..." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No stock records found" message="No inventory items match your search criteria." />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Total In</th>
                <th>Total Out</th>
                <th>Available Balance</th>
                <th>Status</th>
                <th>Valuation (₹)</th>
                <th>Last Movement</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const isOutOfStock = s.currentStock <= 0;
                return (
                  <tr key={s.itemType?._id}>
                    <td>
                      <strong>{s.itemType?.Type_name}</strong>
                    </td>
                    <td>{s.itemType?.category || "General"}</td>
                    <td>{s.itemType?.unit || "pcs"}</td>
                    <td style={{ color: "var(--success)" }}>+{s.totalIn}</td>
                    <td style={{ color: "var(--danger)" }}>-{s.totalOut}</td>
                    <td>
                      <strong style={{ fontSize: "14px", color: isOutOfStock ? "var(--danger)" : "var(--primary)" }}>
                        {s.currentStock} {s.itemType?.unit || "pcs"}
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${isOutOfStock ? "badge-danger" : "badge-success"}`}>
                        {isOutOfStock ? "Out of Stock" : "In Stock"}
                      </span>
                    </td>
                    <td>₹{(s.totalValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td>{s.lastTransaction ? new Date(s.lastTransaction).toLocaleDateString() : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
