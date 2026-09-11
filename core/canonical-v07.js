// HandsFree Mobile REAL 0.7 — canonical read model.
// One PROJECT MASTER + one append-only EVENT LOG view for LIVE READ.
const {dateOnly}=require('./runtime');
function text(v){return String(v??'').trim();}
function pct(v){const m=text(v).match(/(\d{1,3})%/);return m?Math.max(0,Math.min(100,Number(m[1]))):null;}
function actualPct(v){const m=text(v).match(/진척\s*(\d{1,3})%/);return m?Math.max(0,Math.min(100,Number(m[1]))):null;}
function activeStatus(v){const s=text(v).replace(/\s/g,'');return !['완료','출고완료','납품완료'].includes(s);}
function latestByProject(rows,dateField='snapshotDate'){
  const map=new Map();
  for(const row of rows||[]){const id=text(row.projectId);if(!id)continue;const d=dateOnly(row[dateField])||'';const prev=map.get(id);if(!prev||d>(dateOnly(prev[dateField])||''))map.set(id,row);}
  return map;
}
function projectPatternMatches(pattern,id){if(!pattern||!id)return false;if(pattern===id)return true;if(String(pattern).endsWith('*'))return String(id).startsWith(String(pattern).slice(0,-1));return false;}
function eventId(prefix,parts){return [prefix,...parts.map(v=>text(v).replace(/\s+/g,'_')||'NA')].join(':');}

function buildCanonical(snapshot){
  const projects=snapshot?.projects||[], work=snapshot?.events||[], issues=snapshot?.issues||[], changes=snapshot?.changes||[], analyses=snapshot?.analysis90||[];
  const latestAnalysis=latestByProject(analyses);
  const projectMaster=projects.map(p=>{
    const a=latestAnalysis.get(text(p.id));
    const planProgress=pct(p.progressText);
    const actualProgress=actualPct(a?.actualBasis);
    return {
      projectId:text(p.id),orderId:text(p.id),customer:p.customer??null,model:p.model??null,due:dateOnly(p.due)||(p.due??null),
      owners:{sales:p.sales??null,design:p.design??null,production:Array.isArray(p.production)?p.production:[],pm:p.pm??null},
      status:p.status??null,active:activeStatus(p.status),note:p.note??null,
      progress:{plan:planProgress,actual:actualProgress,planLabel:p.progressText??null,actualBasis:a?.actualBasis??null},
      analysis:{
        snapshotDate:dateOnly(a?.snapshotDate),grade:a?.grade??null,productionSlackDays:a?.productionSlackDays??null,
        productionStatus:a?.productionStatus??null,bottleneck:a?.bottleneck??null,purchaseStatus:a?.purchaseStatus??null,
        customerDue:dateOnly(a?.customerDue)||(a?.customerDue??null),operatingDue:dateOnly(a?.operatingDue)||(a?.operatingDue??null),
        assemblyAvailableDate:dateOnly(a?.assemblyAvailableDate),scheduleNetDays:a?.scheduleNetDays??null,actualBasis:a?.actualBasis??null
      },
      source:'제품마스터'
    };
  });

  const eventLog=[];
  for(const e of work){eventLog.push({eventId:text(e.id)||eventId('WORK',[e.date,e.type,e.projectId,e.summary]),projectId:e.projectId??null,occurredAt:dateOnly(e.date),eventType:text(e.type)||'WORK',process:e.process??null,summary:e.summary??null,participants:e.participants??null,status:e.confirmed??null,source:e.source||'업무이력'});}
  for(const i of issues){eventLog.push({eventId:eventId('ISSUE',[i.id]),projectId:i.projectId??null,occurredAt:dateOnly(i.openedAt),eventType:'ISSUE_OPEN',process:i.process??null,summary:i.note||i.type||null,participants:null,status:i.status??null,issueType:i.type??null,source:'HF_DATA_이슈원장'});if(dateOnly(i.closedAt))eventLog.push({eventId:eventId('ISSUE_CLOSE',[i.id]),projectId:i.projectId??null,occurredAt:dateOnly(i.closedAt),eventType:'ISSUE_CLOSE',process:i.process??null,summary:i.resolution??null,participants:null,status:'CLOSED',issueType:i.type??null,source:'HF_DATA_이슈원장'});}
  changes.forEach((c,idx)=>eventLog.push({eventId:eventId('CHANGE',[c.projectId,c.date,idx+1]),projectId:c.projectId??null,occurredAt:dateOnly(c.date),eventType:'PLAN_CHANGE',process:c.process??null,summary:c.reason||c.summary||null,participants:null,status:c.current===false?'SUPERSEDED':'CURRENT',deltaDays:c.deltaDays??null,effectiveDate:dateOnly(c.effectiveDate),source:'HF_DATA_일정변경누적'}));
  eventLog.sort((a,b)=>text(a.occurredAt).localeCompare(text(b.occurredAt))||text(a.eventId).localeCompare(text(b.eventId)));

  const ids=eventLog.map(e=>e.eventId);const dupIds=ids.filter((v,i)=>ids.indexOf(v)!==i);
  const orphanEvents=eventLog.filter(e=>e.projectId&&!projectMaster.some(p=>projectPatternMatches(text(e.projectId),p.projectId))).map(e=>({eventId:e.eventId,projectId:e.projectId,eventType:e.eventType,source:e.source}));
  const progressConflicts=projectMaster.filter(p=>p.progress.plan!==null&&p.progress.actual!==null&&p.progress.plan!==p.progress.actual).map(p=>({projectId:p.projectId,plan:p.progress.plan,actual:p.progress.actual}));
  const latestAnalysisDate=analyses.map(a=>dateOnly(a.snapshotDate)).filter(Boolean).sort().at(-1)||null;
  const asOf=dateOnly(snapshot?.meta?.asOf)||null;
  const analysisAgeDays=latestAnalysisDate&&asOf?Math.round((new Date(asOf+'T00:00:00+09:00')-new Date(latestAnalysisDate+'T00:00:00+09:00'))/86400000):null;

  return {schema:'REAL_CANONICAL_V1',meta:{asOf,generatedAt:snapshot?.meta?.fetchedAt||snapshot?.meta?.generatedAt||null,latestAnalysisDate,analysisAgeDays},projectMaster,eventLog,views:{capacity:snapshot?.capacity||[],briefing:snapshot?.briefing||[],analysis90:analyses},quality:{duplicateEventIds:[...new Set(dupIds)],orphanEvents,progressConflicts}};
}
module.exports={buildCanonical};
