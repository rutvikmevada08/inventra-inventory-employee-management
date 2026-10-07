export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank transfer', 'Cheque', 'Card'];

export const SOURCE_LABELS = {
  lot: 'Purchase received',
  lot_reversal: 'Purchase cancelled',
  item_request: 'Item request issued',
  adjustment: 'Manual adjustment',
  opening_balance: 'Opening balance',
};

export const today = () => new Date().toISOString().slice(0, 10);
