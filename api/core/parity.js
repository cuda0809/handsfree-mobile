const {getCore}=require('../../core/provider');
function yes(v){return v===true||['TRUE','1','Y','YES'].includes(String(v??'').trim().toUpperCase());}
function idMatches(pattern,id){if(!pattern||!id)return false;return pattern===id||(String(pattern).endsWith('*')&&String(id).startsWith(String(pattern).slice(0,-1)))||(String(id).endsWith('*')&&String(pattern).startsWith(String(id).slice(0,-1)));}
module.exports=async(req,res)=>{
  const core=await getCore({force:String(req.query?.refresh||'')==='1'}),source=core.sourceHealth();
  const projects=core.activeProjects(),issues=core.openIssues(),briefing=core.briefing||[],capacity=core.currentCapacity();
  const orphanIssues=issues.filter(i=>i.projectId&&!projects.some(p=>idMatches(i.projectId,p.id)));
  const falseAssemblyBlocks=projects.filter(p=>{
    if(p.assemblyReady!=='BLOCKED')return false;
    const linked=issues.filter(i=>idMatches(i.projectId,p.id));
    return !linked.some(i=>{const t=String(i.type||''),proc=String(i.process||'');return /DELAY|SUPPLY|INBOUND/.test(t)||(!/QUALITY/.test(t)&&/자재|입고|외주/.test(proc));});
  });
  const briefingDecisionRows=briefing.filter(b=>yes(b.decisionRequired));
  const nonResourceDecisionRows=briefingDecisionRows.filter(b=>String(b.lawTag||'')!=='RESOURCE_CAPA'&&String(b.type||'')!=='인력CAPA');
  const unresolvedDecisionRows=nonResourceDecisionRows.filter(b=>!b.projectId&&!b.customer&&!b.summary);
  const resourceDecisionDates=[...new Set(briefingDecisionRows.filter(b=>String(b.lawTag||'')==='RESOURCE_CAPA'||String(b.type||'')==='인력CAPA').map(b=>b.date).filter(Boolean))];
  const missingCapacityDecisionDates=resourceDecisionDates.filter(date=>!capacity.some(c=>String(c.date)===String(date)&&yes(c.decisionRequired)));
  const checks=[
    {id:'SOURCE_IDENTIFIED',pass:Boolean(source.mode),detail:source.label||source.mode},
    {id:'WRITE_GATE_LOCKED',pass:source.writeEnabled===false,detail:source.writeEnabled?'write enabled unexpectedly':'read only'},
    {id:'ISSUE_PROJECT_JOIN',pass:orphanIssues.length===0,detail:`orphans ${orphanIssues.length}`},
    {id:'ASSEMBLY_READY_SUPPLY_ONLY',pass:falseAssemblyBlocks.length===0,detail:`false blocks ${falseAssemblyBlocks.length}`},
    {id:'BRIEFING_DECISION_RECOVERABLE',pass:unresolvedDecisionRows.length===0,detail:`decision rows ${briefingDecisionRows.length}, unresolved ${unresolvedDecisionRows.length}`},
    {id:'CAPA_DECISION_COVERAGE',pass:missingCapacityDecisionDates.length===0,detail:`decision dates ${resourceDecisionDates.length}, missing ${missingCapacityDecisionDates.length}`}
  ];
  const live=Boolean(source.runtimeDirectGoogleRead),allPass=checks.every(c=>c.pass);
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ok:allPass,live,readyForWriteGate:live&&allPass,asOf:core.AS_OF,checks,summary:{activeProjects:projects.length,openIssues:issues.length,briefingDecisionRows:briefingDecisionRows.length,capacityDays:capacity.length},source:{mode:source.mode,label:source.label,runtimeDirectGoogleRead:source.runtimeDirectGoogleRead,writeEnabled:source.writeEnabled,auth:source.auth}});
};
