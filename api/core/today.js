const {getCore}=require('../../core/provider');
function yes(v){return v===true||['TRUE','1','Y','YES'].includes(String(v??'').trim().toUpperCase());}
function rank(v){return({CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3}[v]??9);}
function briefingSeverity(priority){const p=String(priority??'').toUpperCase();return p.includes('CRITICAL')?'CRITICAL':p.includes('HIGH')?'HIGH':p.includes('MEDIUM')?'MEDIUM':'LOW';}
module.exports=async(req,res)=>{
  const core=await getCore({force:String(req.query?.refresh||'')==='1'});
  const decisions=[...core.decisions()];
  for(const b of (core.briefing||[]).filter(x=>yes(x.decisionRequired)&&String(x.lawTag||'')!=='RESOURCE_CAPA'&&String(x.type||'')!=='인력CAPA')){
    const p=b.projectId?core.projectById(b.projectId):null;
    const duplicate=decisions.some(d=>String(d.projectId||'')===String(b.projectId||'')&&String(d.cause||d.decision||'').includes(String(b.summary||'')));
    if(duplicate)continue;
    const title=p?`${p.customer} · ${p.model}`:`${b.customer||'운영'} · ${b.process||b.type||'확인'}`;
    const nextAction=b.planComparison==='연결검토'?'프로젝트 연결과 완료 판정 근거 확인':'근거 확인 후 다음 조치 판단';
    decisions.push({id:`BRIEF-${b.date||'NA'}-${b.projectId||b.customer||'OPS'}`,projectId:b.projectId||null,severity:briefingSeverity(b.priority),title,cause:b.summary||b.analysis||'결정 근거 확인',decision:`${b.summary||b.analysis||'결정 근거 확인'} — ${nextAction}`,nextAction,source:b.source||'HF_VIEW_브리핑소스'});
  }
  const decisionItems=decisions.sort((a,b)=>rank(a.severity)-rank(b.severity)).slice(0,7).map(d=>({id:d.id,projectId:d.projectId||null,severity:d.severity,title:d.title,decision:d.decision,nextAction:d.nextAction,source:d.source}));
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ok:true,mode:core.sourceHealth().mode,readOnly:true,asOf:core.AS_OF,metrics:core.metrics(),decisions:decisionItems,projects:core.activeProjects().map(core.toLegacy),openIssues:core.openIssues().length,capacity:core.currentCapacity(),recentEvents:(core.events||[]).slice(-12).reverse(),source:core.sourceHealth()});
};
