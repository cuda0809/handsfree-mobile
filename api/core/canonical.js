// HandsFree Mobile REAL 0.7 — canonical model health endpoint.
const appsScript=require('../../core/apps-script-v07');
const {buildCanonical}=require('../../core/canonical-v07');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!appsScript.configured())return res.status(503).json({ok:false,code:'CANONICAL_SOURCE_NOT_CONFIGURED',writeLocked:true});
  try{
    const snapshot=await appsScript.loadSnapshot();
    const c=buildCanonical(snapshot);
    const critical=[];
    if(c.quality.duplicateEventIds.length)critical.push('duplicate event ids');
    const warnings=[];
    if(c.meta.analysisAgeDays!==null&&c.meta.analysisAgeDays>1)warnings.push(`analysis stale ${c.meta.analysisAgeDays} days`);
    if(c.quality.progressConflicts.length)warnings.push(`${c.quality.progressConflicts.length} plan/actual progress conflicts separated`);
    if(c.quality.orphanEvents.length)warnings.push(`${c.quality.orphanEvents.length} historical/support events have no current master project`);
    return res.status(critical.length?409:200).json({
      ok:critical.length===0,code:critical.length?'REAL_CANONICAL_FAIL':'REAL_CANONICAL_READY',writeLocked:true,schema:c.schema,
      meta:c.meta,
      counts:{projectMaster:c.projectMaster.length,activeProjects:c.projectMaster.filter(p=>p.active).length,eventLog:c.eventLog.length,capacity:c.views.capacity.length,briefing:c.views.briefing.length,analysis90:c.views.analysis90.length},
      quality:{critical,warningCount:warnings.length,warnings,duplicateEventIds:c.quality.duplicateEventIds,orphanEventCount:c.quality.orphanEvents.length,progressConflictCount:c.quality.progressConflicts.length,progressConflictSample:c.quality.progressConflicts.slice(0,10)},
      sample:{projects:c.projectMaster.slice(0,5),events:c.eventLog.slice(-10)}
    });
  }catch(error){return res.status(500).json({ok:false,code:'REAL_CANONICAL_ERROR',message:error?.message||String(error),writeLocked:true});}
};
