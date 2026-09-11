// HandsFree Mobile REAL 0.7 — Shadow Mode parity + canonical gate.
const appsScript=require('../../core/apps-script-v07');
const {buildCore,idMatches,dateOnly}=require('../../core/runtime');
const {buildCanonical}=require('../../core/canonical-v07');
function text(v){return String(v??'').trim();}
function progressPct(v){const m=text(v).match(/(\d{1,3})%/);return m?Number(m[1]):null;}
function actualPct(v){const m=text(v).match(/진척\s*(\d{1,3})%/);return m?Number(m[1]):null;}
function activeMaster(p){const s=text(p.status).replace(/\s/g,'');return !['완료','출고완료','납품완료'].includes(s);}
function dayDiff(a,b){if(!a||!b)return null;return Math.round((new Date(a+'T00:00:00+09:00')-new Date(b+'T00:00:00+09:00'))/86400000);}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!appsScript.configured())return res.status(503).json({ok:false,code:'SHADOW_SOURCE_NOT_CONFIGURED',writeLocked:true});
  try{
    const snapshot=await appsScript.loadSnapshot();
    const core=buildCore(snapshot,{mode:'apps-script-live',label:'OS v3 LIVE',runtimeLiveRead:true,runtimeDirectGoogleRead:false,auth:'apps-script-token',projectSource:'OS_V3_APPS_SCRIPT',issueSource:'OS_V3_APPS_SCRIPT',capacitySource:'OS_V3_APPS_SCRIPT'});
    const canonical=buildCanonical(snapshot);
    const sourceProjects=snapshot.projects||[], sourceEvents=snapshot.events||[], sourceIssues=snapshot.issues||[], analyses=snapshot.analysis90||[];
    const expectedActive=sourceProjects.filter(activeMaster), coreById=new Map((core.projects||[]).map(p=>[text(p.id),p]));
    const projectChecks=sourceProjects.slice(0,25).map(p=>{const active=activeMaster(p),c=coreById.get(text(p.id)),errors=[];if(active&&!c)errors.push('active project missing from core');if(!active&&c)errors.push('completed project leaked into active core');if(c){if(text(c.customer)!==text(p.customer))errors.push('customer mismatch');if(text(c.model)!==text(p.model))errors.push('model mismatch');const d=dateOnly(p.due);if(d&&text(c.customerDueDate)!==d)errors.push('due mismatch');}return{id:p.id,active,ok:!errors.length,errors};});
    const eventChecks=sourceEvents.slice(0,15).map(e=>({id:e.id,date:e.date,type:e.type,projectId:e.projectId||null,ok:Boolean(e.date&&e.type&&e.summary),linked:e.projectId?sourceProjects.some(p=>idMatches(text(e.projectId),text(p.id))):false}));
    const issueChecks=sourceIssues.slice(0,5).map(i=>{const linked=expectedActive.filter(p=>idMatches(text(i.projectId),text(p.id))).map(p=>p.id),coreIssue=(core.issues||[]).find(x=>text(x.id)===text(i.id)),errors=[];if(!coreIssue)errors.push('issue missing from core');if(!linked.length)errors.push('issue has no active project link');return{id:i.id,projectId:i.projectId,linkedProjects:linked,ok:!errors.length,errors};});
    const latestAnalysisDate=analyses.map(a=>dateOnly(a.snapshotDate)).filter(Boolean).sort().at(-1)||null,asOf=dateOnly(snapshot?.meta?.asOf)||null,analysisAgeDays=latestAnalysisDate&&asOf?dayDiff(asOf,latestAnalysisDate):null;
    const latestByProject=new Map();for(const a of analyses){const id=text(a.projectId),d=dateOnly(a.snapshotDate)||'',old=latestByProject.get(id);if(!old||d>(dateOnly(old.snapshotDate)||''))latestByProject.set(id,a);}
    const progressWarnings=[];for(const p of sourceProjects){const plan=progressPct(p.progressText),a=latestByProject.get(text(p.id)),actual=actualPct(a?.actualBasis);if(plan!==null&&actual!==null&&plan!==actual)progressWarnings.push({id:p.id,planProgress:plan,actualProgress:actual,actualBasis:a.actualBasis});}
    const projectErrors=projectChecks.filter(x=>!x.ok),issueErrors=issueChecks.filter(x=>!x.ok),eventShapeErrors=eventChecks.filter(x=>!x.ok),criticalErrors=[...projectErrors,...issueErrors,...eventShapeErrors];
    if(canonical.quality.duplicateEventIds.length)criticalErrors.push({type:'canonical',error:'duplicate event ids'});
    const warnings=[];if(analysisAgeDays!==null&&analysisAgeDays>1)warnings.push(`90-day analysis snapshot is ${analysisAgeDays} days stale (${latestAnalysisDate})`);if(progressWarnings.length)warnings.push(`${progressWarnings.length} projects have plan-progress vs actual-progress differences; canonical model keeps them separate`);if(canonical.quality.orphanEvents.length)warnings.push(`${canonical.quality.orphanEvents.length} historical/support events are not linked to current master projects`);
    const sampleSize=projectChecks.length+eventChecks.length+issueChecks.length,shadowReady=criticalErrors.length===0,promotionReady=shadowReady&&warnings.length===0;
    return res.status(shadowReady?200:409).json({ok:shadowReady,code:shadowReady?'REAL_SHADOW_PASS':'REAL_SHADOW_FAIL',shadowReady,promotionReady,writeLocked:true,source:{mode:'apps-script-live',label:'OS v3 LIVE',asOf,latestAnalysisDate,analysisAgeDays},sample:{size:sampleSize,projects:projectChecks.length,events:eventChecks.length,issues:issueChecks.length},counts:{masterProjects:sourceProjects.length,expectedActive:expectedActive.length,coreActive:(core.projects||[]).length,events:sourceEvents.length,openIssues:(core.issues||[]).length,analysisRows:analyses.length},canonical:{schema:canonical.schema,projectMaster:canonical.projectMaster.length,activeProjects:canonical.projectMaster.filter(p=>p.active).length,eventLog:canonical.eventLog.length,duplicateEventIds:canonical.quality.duplicateEventIds.length,orphanEvents:canonical.quality.orphanEvents.length,progressConflicts:canonical.quality.progressConflicts.length},errors:{count:criticalErrors.length,projects:projectErrors,events:eventShapeErrors,issues:issueErrors},warnings,progressWarnings:progressWarnings.slice(0,10),samples:{projects:projectChecks,events:eventChecks,issues:issueChecks}});
  }catch(error){return res.status(500).json({ok:false,code:'REAL_SHADOW_ERROR',message:error?.message||String(error),writeLocked:true});}
};
