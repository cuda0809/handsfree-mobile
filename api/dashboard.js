const {AS_OF,projects,metrics,toLegacy} = require('../core/data');

module.exports = (req,res) => {
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true,
    mode:'core-reference',
    readOnly:true,
    now:AS_OF,
    metrics:metrics(),
    data:projects.map(toLegacy),
    source:'REAL_CORE_V0_1_NORMALIZED_V3_SNAPSHOT'
  });
};
