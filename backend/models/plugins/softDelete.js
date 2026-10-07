// Business records are never physically deleted. Deactivating hides them from
// normal lists but keeps every reference (payments, stock, reports) intact.
module.exports = function softDelete(schema) {
  schema.add({
    isActive: { type: Boolean, default: true, index: true },
    deactivatedAt: Date,
    deactivatedBy: { type: schema.constructor.Types.ObjectId, ref: 'User' },
  });

  schema.methods.deactivate = function deactivate(userId) {
    this.isActive = false;
    this.deactivatedAt = new Date();
    this.deactivatedBy = userId;
    return this.save();
  };

  schema.methods.reactivate = function reactivate() {
    this.isActive = true;
    this.deactivatedAt = undefined;
    this.deactivatedBy = undefined;
    return this.save();
  };
};
