const core = require('../../core/runtime');

function idMatches(pattern,id){
  if(!pattern||!id) return false;
  return pattern===id || (String(pattern).endsWith('*') && String(id).startsWith(String(pattern).slice(0,-1)));
}
module.exports = (req,res) => {
  const id=String(req.query?.id||'').trim();
  const includeCompleted=String(req.query?.includeCompleted||'false')==='true';
  let rows=includeCompleted ? core.projects : core.activeProjects();
  if(id) rows=rows.filter(p=>p.id===id);
  const payload=rows.map(p=>({
    ...p,
    events:(core.events||[]).filter(e=>idMatches(e.projectId,p.id)||idMatches(p.id,e.projectId)),
    issues:(core.issues||[]).filter(i=>idMatches(i.projectId,p.id)||idMatches(p.id,i.projectId)),
    changes:(core.changes||[]).filter(c=>idMatches(c.projectId,p.id)||idMatches(p.id,c.projectId)),
    capacityImpacts:(core.capacity||[]).filter(c=>idMatches(c.projectId,p.id)||idMatches(p.id,c.projectId))
  }));
  res.setHeader('Cache-Control','no-store');
  res.status(id&&!payload.length?404:200).json({
    ok:!!payload.length||!id,mode:core.sourceHealth().mode,readOnly:true,
    asOf:core.AS_OF,projects:payload,source:core.sourceHealth()
  });
};