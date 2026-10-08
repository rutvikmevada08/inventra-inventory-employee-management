import React, { useEffect, useState } from "react";
import API from "../api";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/Feedback";

export const Reports = () => {
  const [reportType, setReportType] = useState("inventory");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const reportOptions = [
    { id: "inventory", label: "1. Inventory Stock Report" },
    { id: "stock-movement", label: "2. Stock Movement & Ledger Report" },
    { id: "purchase", label: "3. Purchase & Lots Report" },
    { id: "vendor", label: "4. Vendor Accounts Report" },
    { id: "fuel", label: "5. Fleet Fuel Consumption Report" },
    { id: "reimbursement", label: "6. Reimbursement Claims Report" },
    { id: "employee", label: "7. Workforce Directory Report" },
    { id: "attendance", label: "8. Workforce Attendance Report" },
    { id: "payroll", label: "9. Monthly Payroll Ledger Report" },
    { id: "payment", label: "10. Wage Disbursements Report" },
    { id: "expense", label: "11. Operational Expenses Report" },
  ];

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { type: reportType };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await API.get("/reports/data", { params });
      setData(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate]);

  const token = localStorage.getItem("token") || "";

  const handleExportExcel = () => {
    const url = `/api/reports/export/excel?type=${reportType}&startDate=${startDate}&endDate=${endDate}&token=${token}`;
    window.open(url, "_blank");
  };

  const handleExportPDF = () => {
    const url = `/api/reports/export/pdf?type=${reportType}&startDate=${startDate}&endDate=${endDate}&token=${token}`;
    window.open(url, "_blank");
  };

  const handleDownloadInvestorSheet = () => {
    // Form submission or direct trigger
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `/api/reports/legacy/investor-sheet?token=${token}`;
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handleDownloadInventorySheet = () => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `/api/reports/legacy/inventory-sheet?token=${token}`;
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Reports & Document Exports</h1>
          <p className="page-desc">Generate tabular analytics, export Excel (.xlsx) spreadsheets, and produce PDF summaries.</p>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel} disabled={loading || data.length === 0}>
            Export Excel (.xlsx)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPDF} disabled={loading || data.length === 0}>
            Export PDF Report
          </button>
        </div>
      </div>

      <ErrorMessage message={error} onDismiss={() => setError("")} />

      {/* Filter toolbar */}
      <div className="filter-bar">
        <label className="form-label" style={{ margin: 0 }}>Select Report:</label>
        <select
          className="form-select"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          style={{ width: "280px" }}
        >
          {reportOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>

        <label className="form-label" style={{ margin: 0 }}>Start Date:</label>
        <input
          type="date"
          className="form-control"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ width: "150px" }}
        />

        <label className="form-label" style={{ margin: 0 }}>End Date:</label>
        <input
          type="date"
          className="form-control"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{ width: "150px" }}
        />

        <div style={{ marginLeft: "auto", fontSize: "13px", color: "var(--text-muted)" }}>
          Records: <strong>{data.length}</strong>
        </div>
      </div>

      {/* Legacy Specific Sheets Banner */}
      <div className="card" style={{ backgroundColor: "#f8fafc", padding: "14px 18px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <strong style={{ fontSize: "13px" }}>Original Formatted Excel Exports (Preserved Layouts)</strong>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Download investor presentation sheet (with multi-tier headers and USD/INR conversions) and peripheral inventory sheet.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadInvestorSheet}>
              Download Investor Sheet
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadInventorySheet}>
              Download Inventory Sheet
            </button>
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      {loading ? (
        <LoadingSpinner message="Generating report data..." />
      ) : data.length === 0 ? (
        <EmptyState title="No report records found" message="No records exist for the selected report parameters and date range." />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                {Object.keys(data[0]).map((col) => (
                  <th key={col}>{col.replace(/([A-Z])/g, " $1").toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  {Object.keys(row).map((col) => (
                    <td key={col}>
                      {typeof row[col] === "number" && (col.toLowerCase().includes("cost") || col.toLowerCase().includes("amount") || col.toLowerCase().includes("total") || col.toLowerCase().includes("wage") || col.toLowerCase().includes("net") || col.toLowerCase().includes("gross") || col.toLowerCase().includes("balance"))
                        ? `₹${row[col].toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        : String(row[col] !== undefined && row[col] !== null ? row[col] : "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
