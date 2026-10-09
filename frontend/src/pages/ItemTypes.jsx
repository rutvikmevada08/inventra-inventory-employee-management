<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

export const ItemTypes = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "General",
    unit: "pcs",
    description: "",
  });

  const { isAdmin } = useAuth();

  const fetchTypes = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/inventory/item-types");
      setTypes(res.data.itemTypes || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load item types.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      setError("");
      await API.post("/inventory/item-types", formData);
      setSuccess("New item type created.");
      setIsModalOpen(false);
      setFormData({ name: "", category: "General", unit: "pcs", description: "" });
      fetchTypes();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create item type.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catalog Item Types</h1>
          <p className="page-desc">Manage standard inventory classifications, measurement units, and product types.</p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              + Add Item Type
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
        <LoadingSpinner message="Loading item catalog..." />
      ) : types.length === 0 ? (
        <EmptyState
          title="No item types configured"
          message="Define catalog item types for purchases and workforce requests."
          action={
            isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
                Add Item Type
              </button>
            )
          }
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Item Type Name</th>
                <th>Category</th>
                <th>Standard Unit</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t._id}>
                  <td><strong>{t.Type_name}</strong></td>
                  <td>{t.category || "General"}</td>
                  <td>{t.unit || "pcs"}</td>
                  <td>{t.description || "-"}</td>
                  <td>
                    <span className="badge badge-success">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Catalog Item Type">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Item Type Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Mechanical Hardware, 3D Printer Filament"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Hardware, Consumable, Tools"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. pcs, kg, litres, meters"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows="2"
              placeholder="Scope of items or hardware specification..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Item Type
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
=======
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
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b
