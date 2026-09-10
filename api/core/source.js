const core = require('../../core/runtime');

module.exports = (req,res) => {
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ok:true,source:core.sourceHealth(),capacity:core.currentCapacity()});
};