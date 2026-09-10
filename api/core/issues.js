const {AS_OF,issues,projectById} = require('../../core/data');

module.exports = (req,res) => {
  const status=(req.query?.status||'OPEN').toUpperCase();
  const rows=issues.filter(i=>status==='ALL' ? true : status==='OPEN' ? i.status!=='CLOSED' : i.status===status).map(i=>({
    ...i,
    project:projectById(i.projectId)||null
  }));
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ok:true,mode:'core-reference',readOnly:true,asOf:AS_OF,count:rows.length,issues:rows});
};
