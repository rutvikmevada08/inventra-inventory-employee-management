import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";

export const DailyWages = () => {
  const [wages, setWages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(currentMonthStr);

  const fetchWages = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/attendance/wages", { params: { month } });
      setWages(res.data.wages || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to calculate daily wages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWages();
  }, [month]);

  const totalGrossWage = wages.reduce((sum, w) => sum + (w.grossWage || 0), 0);
  const totalEligibleDays = wages.reduce((sum, w) => sum + (w.eligibleDays || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Wages Calculation</h1>
          <p className="page-desc">Backend calculation engine: eligible_days = Present (1.0) + Half Day (0.5). Gross = eligible_days &times; rate.</p>
        </div>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError("")} />

      {/* Month Filter */}
      <div className="filter-bar">
        <label className="form-label" style={{ margin: 0 }}>Calculation Month:</label>
        <input
          type="month"
          className="form-control"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ width: "170px" }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: "20px", fontSize: "13px" }}>
          <span>Total Eligible Days: <strong>{totalEligibleDays.toFixed(1)}</strong></span>
          <span>Total Calculated Gross: <strong style={{ color: "var(--primary)" }}>₹{totalGrossWage.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating wage totals from attendance records..." />
      ) : wages.length === 0 ? (
        <EmptyState
          title="No attendance wage data"
          message={`No attendance records logged for ${month}. Record attendance to generate wage breakdowns.`}
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Present (1.0)</th>
                <th>Half Day (0.5)</th>
                <th>Absent (0.0)</th>
                <th>Leave (0.0)</th>
                <th>Eligible Days</th>
                <th>Daily Rate</th>
                <th style={{ textAlign: "right" }}>Gross Wages (₹)</th>
              </tr>
            </thead>
            <tbody>
              {wages.map((item) => (
                <tr key={item.employee._id}>
                  <td><strong>{item.employee.employeeId || "-"}</strong></td>
                  <td style={{ fontWeight: 600 }}>{item.employee.name}</td>
                  <td>{item.employee.department}</td>
                  <td style={{ color: "var(--success)", fontWeight: 600 }}>{item.presentDays}</td>
                  <td style={{ color: "var(--warning)", fontWeight: 600 }}>{item.halfDays}</td>
                  <td style={{ color: "var(--danger)" }}>{item.absentDays}</td>
                  <td>{item.leaveDays}</td>
                  <td>
                    <strong>{item.eligibleDays.toFixed(1)}</strong>
                  </td>
                  <td>₹{(item.dailyWage || 0).toFixed(2)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: "14px", color: "var(--primary)" }}>
                    ₹{(item.grossWage || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "var(--bg-card-alt)", fontWeight: 700 }}>
                <td colSpan="7">TOTALS</td>
                <td>{totalEligibleDays.toFixed(1)}</td>
                <td>-</td>
                <td style={{ textAlign: "right", color: "var(--primary)", fontSize: "15px" }}>
                  ₹{totalGrossWage.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
