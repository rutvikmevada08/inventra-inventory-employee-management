// The input sits inside the label, so clicking the label focuses it and screen readers announce it.
export default function Field({ label, error, hint, required, className = '', children }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}{required && ' *'}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
