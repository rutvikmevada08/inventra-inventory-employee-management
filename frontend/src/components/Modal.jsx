import { useEffect } from 'react';

export default function Modal({ title, onClose, children, footer, wide, isOpen = true, maxWidth }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (isOpen === false) return null;

  return (
    <div
      className="modal-backdrop modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}
      onClick={(e) => e.target === e.currentTarget && onClose && onClose()}
    >
      <div
        className={`modal modal-container${wide ? ' modal-wide' : ''}`}
        style={maxWidth ? { maxWidth } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button type="button" className="icon-btn modal-close-btn" aria-label="Close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export { Modal };
