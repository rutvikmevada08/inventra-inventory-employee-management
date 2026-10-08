import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, ErrorMessage } from "../components/Feedback";
import { useAuth } from "../context/AuthContext";

export const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [employeesData, setEmployeesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { isAdmin } = useAuth();

  const fetchDailyStatus = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/attendance/daily-status", { params: { date: selectedDate } });
      const list = res.data.employees || [];
      // Initialize editable state
      const initialized = list.map((item) => ({
        employeeId: item.employee._id,
        name: item.employee.name,
        code: item.employee.employeeId,
        department: item.employee.department,
        status: item.attendance ? item.attendance.status : "Present", // default to Present if unmarked
        note: item.attendance ? item.attendance.note || "" : "",
        isAlreadyMarked: Boolean(item.attendance),
      }));
      setEmployeesData(initialized);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load attendance for selected date.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyStatus();
  }, [selectedDate]);

  const handleStatusChange = (index, status) => {
    const updated = [...employeesData];
    updated[index].status = status;
    setEmployeesData(updated);
  };

  const handleNoteChange = (index, note) => {
    const updated = [...employeesData];
    updated[index].note = note;
    setEmployeesData(updated);
  };

  const handleSaveAll = async () => {
    if (!isAdmin) return;
    try {
      setSaving(true);
      setError("");
      const payload = {
        date: selectedDate,
        records: employeesData.map((e) => ({
          employeeId: e.employeeId,
          status: e.status,
          note: e.note,
        })),
      };
      await API.post("/attendance/bulk", payload);
      setSuccess(`Attendance for ${selectedDate} saved successfully.`);
      fetchDailyStatus();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkIndividual = async (row) => {
    if (!isAdmin) return;
    try {
      setError("");
      await API.post("/attendance", {
        employeeId: row.employeeId,
        date: selectedDate,
        status: row.status,
        note: row.note,
      });
      setSuccess(`Updated attendance for ${row.name}.`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update attendance.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Attendance Tracker</h1>
          <p className="page-desc">Record workforce presence: Present (1.0), Half Day (0.5), Absent, or Leave</p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={handleSaveAll}
              disabled={saving || loading || employeesData.length === 0}
            >
              {saving ? "Saving All..." : "Save All Attendance"}
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

      {/* Date Picker Toolbar */}
      <div className="filter-bar">
        <label className="form-label" style={{ margin: 0 }}>Attendance Date:</label>
        <input
          type="date"
          className="form-control"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ width: "160px" }}
        />
        <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "auto" }}>
          Active Employees: <strong>{employeesData.length}</strong>
        </span>
      </div>

      {loading ? (
        <LoadingSpinner message={`Loading attendance register for ${selectedDate}...`} />
      ) : employeesData.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "var(--text-muted)" }}>No active employees found in directory.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Attendance Status</th>
                <th>Notes / Remarks</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {employeesData.map((row, index) => (
                <tr key={row.employeeId}>
                  <td><strong>{row.code || "-"}</strong></td>
                  <td style={{ fontWeight: 600 }}>{row.name}</td>
                  <td>{row.department}</td>
                  <td>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      {["Present", "Half Day", "Absent", "Leave"].map((statusOption) => {
                        const isSelected = row.status === statusOption;
                        return (
                          <button
                            key={statusOption}
                            type="button"
                            className={`btn btn-sm ${
                              isSelected
                                ? statusOption === "Present"
                                  ? "btn-success"
                                  : statusOption === "Half Day"
                                  ? "btn-secondary"
                                  : "btn-danger"
                                : "btn-secondary"
                            }`}
                            style={{
                              fontWeight: isSelected ? 700 : 400,
                              borderColor: isSelected ? "transparent" : "var(--border-color)",
                            }}
                            onClick={() => handleStatusChange(index, statusOption)}
                            disabled={!isAdmin}
                          >
                            {statusOption}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Remarks..."
                      value={row.note}
                      onChange={(e) => handleNoteChange(index, e.target.value)}
                      disabled={!isAdmin}
                      style={{ maxWidth: "240px", padding: "4px 8px" }}
                    />
                  </td>
                  {isAdmin && (
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMarkIndividual(row)}
                      >
                        Save
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
