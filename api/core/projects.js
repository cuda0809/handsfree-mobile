const {AS_OF,projects,events,issues} = require('../../core/data');

module.exports = (req,res) => {
  const id = (req.query?.id || '').trim();
  const rows = id ? projects.filter(p=>p.id===id) : projects;
  const payload = rows.map(p=>({
    ...p,
    events:events.filter(e=>e.projectId===p.id || (e.projectId.endsWith('*') && p.id.startsWith(e.projectId.slice(0,-1)))),
    issues:issues.filter(i=>i.projectId===p.id && i.status!=='CLOSED')
  }));
  res.setHeader('Cache-Control','no-store');
  res.status(id && !payload.length ? 404 : 200).json({ok:!!payload.length,mode:'core-reference',readOnly:true,asOf:AS_OF,projects:payload});
};
