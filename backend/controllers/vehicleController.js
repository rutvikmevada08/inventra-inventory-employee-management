const simpleCrud = require('./simpleCrud');
const Vehicle = require('../models/Vehicle');

module.exports = simpleCrud(Vehicle, {
  label: 'vehicle',
  fields: ['name', 'number', 'notes'],
  searchFields: ['name', 'number'],
  uniqueField: 'number',
});
