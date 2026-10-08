import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const Purchases = () => {
  const [lots, setLots] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create Lot Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lotForm, setLotForm] = useState({
    Vendor: "",
    Purchase_date: new Date().toISOString().split("T")[0],
    Invoice_number: "",
    Total_payable: "",
    Total_paid: "0",
    Lot_type: "General",
    Paid_by: "Sanjeev Sharma",
    Description: "",
  });
  const [lineItems, setLineItems] = useState([
    { Item_type: "", Cost_per_unit: "", Quantity: "", Total_payable: "" },
  ]);
  const [invoiceFile, setInvoiceFile] = useState(null);

  // Part Payment Modal
  const [payModal, setPayModal] = useState({ open: false, lot: null, amount: "" });

  const { isAdmin } = useAuth();

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError("");
      const [lotsRes, vendorsRes, typesRes] = await Promise.all([
        API.get("/inventory/lots"),
        API.get("/vendors?status=active"),
        API.get("/inventory/item-types"),
      ]);
      setLots(lotsRes.data.lots || []);
      setVendors(vendorsRes.data.vendors || []);
      setItemTypes(typesRes.data.itemTypes || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load purchase lots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleOpenAddLot = () => {
    setLotForm({
      Vendor: vendors.length > 0 ? vendors[0]._id : "",
      Purchase_date: new Date().toISOString().split("T")[0],
      Invoice_number: "",
      Total_payable: "",
      Total_paid: "0",
      Lot_type: "General",
      Paid_by: "Sanjeev Sharma",
      Description: "",
    });
    setLineItems([
      { Item_type: itemTypes.length > 0 ? itemTypes[0]._id : "", Cost_per_unit: "", Quantity: "1", Total_payable: "" },
    ]);
    setInvoiceFile(null);
    setIsModalOpen(true);
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    if (field === "Cost_per_unit" || field === "Quantity") {
      const price = Number(updated[index].Cost_per_unit) || 0;
      const qty = Number(updated[index].Quantity) || 0;
      updated[index].Total_payable = (price * qty).toFixed(2);
    }
    setLineItems(updated);

    // Sum total payable
    const sumTotal = updated.reduce((s, itm) => s + (Number(itm.Total_payable) || 0), 0);
    setLotForm((prev) => ({ ...prev, Total_payable: sumTotal.toFixed(2) }));
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { Item_type: itemTypes.length > 0 ? itemTypes[0]._id : "", Cost_per_unit: "", Quantity: "1", Total_payable: "" },
    ]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length === 1) return;
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
    const sumTotal = updated.reduce((s, itm) => s + (Number(itm.Total_payable) || 0), 0);
    setLotForm((prev) => ({ ...prev, Total_payable: sumTotal.toFixed(2) }));
  };

  const handleSubmitLot = async (e) => {
    e.preventDefault();
    if (!lotForm.Vendor || !lotForm.Invoice_number || !lotForm.Total_payable) {
      setError("Please complete all required lot fields.");
      return;
    }

    try {
      setError("");
      const formData = new FormData();
      Object.keys(lotForm).forEach((key) => formData.append(key, lotForm[key]));
      formData.append("items", JSON.stringify(lineItems));
      if (invoiceFile) {
        formData.append("invoice", invoiceFile);
      }

      await API.post("/inventory/lots", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Purchase lot added successfully.");
      setIsModalOpen(false);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create lot.");
    }
  };

  const handleReceiveStock = async (lot) => {
    if (!isAdmin) return;
    if (!window.confirm(`Receive items from Lot invoice #${lot.Invoice_number} into active inventory stock?`)) {
      return;
    }
    try {
      setError("");
      await API.post(`/inventory/lots/${lot._id}/receive`);
      setSuccess(`Stock received from Lot #${lot.Invoice_number} and logged in inventory ledger.`);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to receive lot stock.");
    }
  };

  const handleRecordPartPayment = async (e) => {
    e.preventDefault();
    if (!payModal.amount || Number(payModal.amount) <= 0) return;
    try {
      setError("");
      await API.post(`/inventory/lots/${payModal.lot._id}/payment`, { amount: payModal.amount });
      setSuccess("Part payment recorded against lot invoice.");
      setPayModal({ open: false, lot: null, amount: "" });
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record payment.");
    }
  };

  const handleMarkClear = async (lot) => {
    if (!isAdmin) return;
    if (!window.confirm(`Mark invoice #${lot.Invoice_number} as completely cleared and paid?`)) {
      return;
    }
    try {
      setError("");
      await API.post(`/inventory/lots/${lot._id}/mark-clear`);
      setSuccess(`Lot #${lot.Invoice_number} marked as fully cleared.`);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to mark as clear.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases & Purchase Lots</h1>
          <p className="page-desc">
            Manage vendor purchase invoices, line items, stock receipt into ledger, and invoice payment settlements.
          </p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleOpenAddLot}>
              + Record Purchase Lot
            </button>
          </div>
        )}
      </div>

      <ErrorMessage message={error} onDismiss={() => setError("")} />
      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess("")}>&times;</button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Loading purchase lots..." />
      ) : lots.length === 0 ? (
        <EmptyState
          title="No purchase lots found"
          message="Record a purchase invoice to receive items into warehouse inventory."
          action={
            isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAddLot}>
                Record Purchase Lot
              </button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Purchase Date</th>
                <th>Vendor</th>
                <th>Items Count</th>
                <th>Total Payable (₹)</th>
                <th>Total Paid (₹)</th>
                <th>Balance (₹)</th>
                <th>Stock Status</th>
                <th>Payment Status</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const bal = Math.max(0, Math.round(((lot.Total_payable || 0) - (lot.Total_paid || 0)) * 100) / 100);
                const isCleared = bal === 0;
                return (
                  <tr key={lot._id}>
                    <td>
                      <strong>#{lot.Invoice_number}</strong>
                      {lot.Invoice && lot.Invoice !== "no-invoice" && (
                        <div style={{ fontSize: "11px", marginTop: "2px" }}>
                          <a
                            href={lot.Invoice.startsWith("/") ? lot.Invoice : `/${lot.Invoice}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Invoice
                          </a>
                        </div>
                      )}
                    </td>
                    <td>{new Date(lot.Purchase_date).toLocaleDateString()}</td>
                    <td>{lot.Vendor ? lot.Vendor.Business_name : "-"}</td>
                    <td>{lot.Items?.length || 0} line items</td>
                    <td><strong>₹{(lot.Total_payable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></td>
                    <td style={{ color: "var(--success)" }}>
                      ₹{(lot.Total_paid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: bal > 0 ? "var(--primary)" : "var(--text-light)", fontWeight: 700 }}>
                      ₹{bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${lot.Received ? "badge-success" : "badge-warning"}`}>
                        {lot.Received ? "Received" : "Not Received"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isCleared ? "badge-success" : lot.Total_paid > 0 ? "badge-warning" : "badge-danger"}`}>
                        {isCleared ? "Cleared" : lot.Total_paid > 0 ? "Partial" : "Unpaid"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {!lot.Received && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleReceiveStock(lot)}
                              title="Receive into stock ledger"
                            >
                              Receive Stock
                            </button>
                          )}
                          {!isCleared && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setPayModal({ open: true, lot, amount: String(bal) })}
                              >
                                Pay
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleMarkClear(lot)}
                                title="Mark as clear"
                              >
                                Mark Clear
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Purchase Lot Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Purchase Lot & Invoice"
        maxWidth="700px"
      >
        <form onSubmit={handleSubmitLot}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vendor *</label>
              <select
                className="form-select"
                value={lotForm.Vendor}
                onChange={(e) => setLotForm({ ...lotForm, Vendor: e.target.value })}
                required
              >
                <option value="">Select Vendor...</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.Business_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Invoice Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. INV-2026-081"
                value={lotForm.Invoice_number}
                onChange={(e) => setLotForm({ ...lotForm, Invoice_number: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Purchase Date *</label>
              <input
                type="date"
                className="form-control"
                value={lotForm.Purchase_date}
                onChange={(e) => setLotForm({ ...lotForm, Purchase_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Paid By</label>
              <input
                type="text"
                className="form-control"
                value={lotForm.Paid_by}
                onChange={(e) => setLotForm({ ...lotForm, Paid_by: e.target.value })}
              />
            </div>
          </div>

          {/* Line items section */}
          <div style={{ margin: "16px 0", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: 700 }}>Purchased Items</h4>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLineItem}>
                + Add Item
              </button>
            </div>

            {lineItems.map((itm, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <select
                  className="form-select"
                  value={itm.Item_type}
                  onChange={(e) => handleLineItemChange(idx, "Item_type", e.target.value)}
                  required
                >
                  <option value="">Choose item type...</option>
                  {itemTypes.map((it) => (
                    <option key={it._id} value={it._id}>
                      {it.Type_name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  placeholder="Rate (₹)"
                  value={itm.Cost_per_unit}
                  onChange={(e) => handleLineItemChange(idx, "Cost_per_unit", e.target.value)}
                  required
                />

                <input
                  type="number"
                  min="1"
                  className="form-control"
                  placeholder="Qty"
                  value={itm.Quantity}
                  onChange={(e) => handleLineItemChange(idx, "Quantity", e.target.value)}
                  required
                />

                <input
                  type="number"
                  className="form-control"
                  placeholder="Total"
                  value={itm.Total_payable}
                  readOnly
                  style={{ backgroundColor: "var(--bg-card-alt)" }}
                />

                {lineItems.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleRemoveLineItem(idx)}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Total Payable Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={lotForm.Total_payable}
                onChange={(e) => setLotForm({ ...lotForm, Total_payable: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Paid Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={lotForm.Total_paid}
                onChange={(e) => setLotForm({ ...lotForm, Total_paid: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Attach Invoice Document (PDF, Image)</label>
            <input
              type="file"
              className="form-control"
              accept=".jpg,.jpeg,.png,.pdf,.webp"
              onChange={(e) => setInvoiceFile(e.target.files[0] || null)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Remarks</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="e.g. Mechanical components and spare parts"
              value={lotForm.Description}
              onChange={(e) => setLotForm({ ...lotForm, Description: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Lot & Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Part Payment Modal */}
      <Modal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, lot: null, amount: "" })}
        title={`Record Payment for Invoice #${payModal.lot?.Invoice_number}`}
        maxWidth="460px"
      >
        <form onSubmit={handleRecordPartPayment}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "14px" }}>
            Total Payable: ₹{payModal.lot?.Total_payable} | Already Paid: ₹{payModal.lot?.Total_paid}
          </p>

          <div className="form-group">
            <label className="form-label">Payment Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-control"
              placeholder="Enter amount"
              value={payModal.amount}
              onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPayModal({ open: false, lot: null, amount: "" })}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Record Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
