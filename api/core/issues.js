const core = require('../../core/runtime');

module.exports = (req,res) => {
  const status=String(req.query?.status||'OPEN').toUpperCase();
  const rows=(core.issues||[]).filter(i=>status==='ALL'?true:status==='OPEN'?i.status!=='CLOSED':i.status===status)
    .map(i=>({...i,project:core.projectById(i.projectId)||null}));
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true,mode:core.sourceHealth().mode,readOnly:true,asOf:core.AS_OF,
    count:rows.length,issues:rows,source:core.sourceHealth()
  });
};