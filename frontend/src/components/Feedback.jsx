import React from "react";

export const LoadingSpinner = ({ message = "Loading data..." }) => (
  <div className="loading-state">
    <div className="spinner"></div>
    <p className="loading-text">{message}</p>
  </div>
);

export const EmptyState = ({ title = "No records found", message = "There is no data to display right now.", action }) => (
  <div className="empty-state">
    <div className="empty-indicator">---</div>
    <h4 className="empty-title">{title}</h4>
    <p className="empty-desc">{message}</p>
    {action && <div className="empty-action">{action}</div>}
  </div>
);

export const ErrorMessage = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div className="alert alert-error">
      <span>{message}</span>
      {onDismiss && (
        <button className="alert-close" onClick={onDismiss}>
          &times;
        </button>
      )}
    </div>
  );
};
