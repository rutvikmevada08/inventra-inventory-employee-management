const simpleCrud = require('./simpleCrud');
const ItemType = require('../models/ItemType');

module.exports = simpleCrud(ItemType, {
  label: 'item type',
  fields: ['name', 'unit', 'reorderLevel', 'isStockable'],
});
