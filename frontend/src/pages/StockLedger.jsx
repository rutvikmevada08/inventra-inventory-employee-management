import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";

export const StockLedger = () => {
  const [ledger, setLedger] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [itemTypeFilter, setItemTypeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (itemTypeFilter) params.itemTypeId = itemTypeFilter;
      if (typeFilter) params.transactionType = typeFilter;

      const [ledgerRes, typesRes] = await Promise.all([
        API.get("/inventory/ledger", { params }),
        API.get("/inventory/item-types"),
      ]);

      setLedger(ledgerRes.data.ledger || []);
      setItemTypes(typesRes.data.itemTypes || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch stock ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [itemTypeFilter, typeFilter]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Stock Movement Ledger</h1>
          <p className="page-desc">
            Immutable transaction log of every stock receipt, issuance, and audit adjustment.
          </p>
        </div>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError("")} />

      {/* Filters */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={itemTypeFilter}
          onChange={(e) => setItemTypeFilter(e.target.value)}
          style={{ width: "240px" }}
        >
          <option value="">All Item Types</option>
          {itemTypes.map((it) => (
            <option key={it._id} value={it._id}>
              {it.Type_name}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: "180px" }}
        >
          <option value="">All Movements</option>
          <option value="STOCK_IN">STOCK_IN (Purchase)</option>
          <option value="STOCK_OUT">STOCK_OUT (Issued)</option>
          <option value="ADJUSTMENT">ADJUSTMENT</option>
          <option value="REVERSAL">REVERSAL</option>
        </select>

        <div style={{ marginLeft: "auto", fontSize: "13px", color: "var(--text-muted)" }}>
          Total Movement Records: <strong>{ledger.length}</strong>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Retrieving auditable inventory transactions..." />
      ) : ledger.length === 0 ? (
        <EmptyState title="No transactions recorded" message="No inventory transactions exist matching your filter criteria." />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Item Type</th>
                <th>Movement Type</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total Value</th>
                <th>Balance After</th>
                <th>Reference</th>
                <th>Notes / Purpose</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => {
                const isPositive = ["STOCK_IN", "REVERSAL"].includes(entry.transactionType);
                return (
                  <tr key={entry._id}>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>
                      <strong>{entry.itemType?.Type_name}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          entry.transactionType === "STOCK_IN"
                            ? "badge-success"
                            : entry.transactionType === "STOCK_OUT"
                            ? "badge-danger"
                            : "badge-neutral"
                        }`}
                      >
                        {entry.transactionType}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: isPositive ? "var(--success)" : "var(--danger)" }}>
                        {isPositive ? `+${entry.quantity}` : `-${entry.quantity}`}
                      </strong>
                    </td>
                    <td>₹{(entry.unitCost || 0).toFixed(2)}</td>
                    <td>₹{(entry.totalCost || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 700 }}>
                      {entry.balanceAfter} {entry.itemType?.unit || "pcs"}
                    </td>
                    <td>
                      {entry.referenceType === "LOT_PURCHASE" && entry.lot ? (
                        <span>Lot #{entry.lot.Invoice_number}</span>
                      ) : entry.referenceType === "ITEM_REQUEST" && entry.itemRequest ? (
                        <span>Request #{entry.itemRequest._id.slice(-6)}</span>
                      ) : (
                        <span>{entry.referenceType}</span>
                      )}
                    </td>
                    <td>{entry.notes || "-"}</td>
                    <td>{entry.createdBy ? entry.createdBy.name : "-"}</td>
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
