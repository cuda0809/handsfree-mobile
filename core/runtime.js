// HandsFree Mobile REAL 0.2 — runtime source boundary.
// Public repository code never contains new OS v3 operational exports.
// If HF_OS_V3_SNAPSHOT_JSON exists in the private server runtime, it wins.
// Otherwise the already-existing REAL 0.1 reference dataset is used.

const reference = require('./data');

function parsePrivateSnapshot() {
  const raw = process.env.HF_OS_V3_SNAPSHOT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.projects)) return null;
    return parsed;
  } catch (error) {
    return { __error: error.message };
  }
}

const privateSource = parsePrivateSnapshot();

function idMatches(pattern, id) {
  if (!pattern || !id) return false;
  if (pattern === id) return true;
  if (pattern.endsWith('*')) return id.startsWith(pattern.slice(0, -1));
  return false;
}
function text(v) { return String(v ?? '').trim(); }
function dateOnly(v) {
  const s=text(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
function progressOf(v) {
  const m=text(v).match(/(\d{1,3})%/);
  return m ? Math.max(0, Math.min(100, Number(m[1]))) : null;
}
function activeProject(p) {
  return !['완료','출고완료'].includes(text(p.status)) && progressOf(p.progressText) !== 100;
}
function joins(list, projectId, field='projectId') {
  return (list||[]).filter(row => idMatches(text(row[field]), projectId) || idMatches(projectId, text(row[field])));
}
function severityRank(v) { return ({CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3}[v] ?? 9); }

function fromPrivate(snapshot) {
  const AS_OF = dateOnly(snapshot?.meta?.asOf) || new Date().toISOString().slice(0,10);
  const rawEvents = snapshot.events || [];
  const rawIssues = snapshot.issues || [];
  const rawChanges = snapshot.changes || [];
  const rawCapacity = snapshot.capacity || [];

  const projects = (snapshot.projects||[]).filter(activeProject).map(p => {
    const events = joins(rawEvents,p.id);
    const issues = joins(rawIssues,p.id).filter(i => text(i.status).toUpperCase() !== 'CLOSED');
    const changes = joins(rawChanges,p.id);
    const actuals = events.filter(e => ['일일작업','출고완료'].includes(text(e.type)) || ['ACTUAL','DELIVERY'].includes(text(e.lawTag)));
    const latestEvent = actuals.sort((a,b)=>text(a.date).localeCompare(text(b.date))).at(-1) || null;
    const qualityActive = issues.some(i => /QUALITY/.test(text(i.type)));
    const supplyBlocked = issues.some(i => /DELAY|SUPPLY|INBOUND/.test(text(i.type)) || /자재|입고|외주/.test(text(i.process)));
    let assemblyReady = 'UNKNOWN';
    if (qualityActive || supplyBlocked) assemblyReady = 'BLOCKED';
    if (text(p.status)==='PM협의') assemblyReady = 'READY';

    const due=dateOnly(p.due);
    const dueDays=due ? Math.ceil((new Date(due+'T00:00:00+09:00')-new Date(AS_OF+'T00:00:00+09:00'))/86400000) : null;
    let risk='안정';
    if (text(p.status)==='PM협의') risk='협의';
    else if (qualityActive || supplyBlocked || (dueDays!==null && dueDays<=14)) risk='주의';
    if (dueDays!==null && dueDays<=7 && assemblyReady==='BLOCKED') risk='긴급';

    const state = latestEvent?.summary || text(p.status) || (progressOf(p.progressText)===0?'생산전':'진행상태 확인');
    let nextGate='다음 공정 확인';
    if (/출고/.test(state)) nextGate='완료';
    else if (/검수/.test(state)) nextGate='출고 승인';
    else if (/테스트/.test(state)) nextGate='검수/FAT';
    else if (/프로그램/.test(state)) nextGate='테스트';
    else if (/전장/.test(state)) nextGate='프로그램/테스트';
    else if (/조립|보완/.test(state)) nextGate='전장';
    else if (/생산전/.test(state)) nextGate='자재확보/조립 착수';

    const blocker = issues.map(i => i.note || i.type || i.process).filter(Boolean).join(' · ') || '';
    return {
      id:p.id, customer:p.customer, model:p.model, pm:p.pm || null,
      sales:p.sales || null, design:p.design || null, production:p.production || [],
      risk, riskReason:blocker || (dueDays!==null?`납기 D${dueDays>=0?'-':'+'}${Math.abs(dueDays)}`:'직접 근거 확인'),
      stage:text(latestEvent?.process)||null, state, nextGate, assemblyReady,
      customerDueDate:due, shipmentPlan:due, inspection:/검수/.test(state)?state:'검수 전 단계',
      supplyStatus:supplyBlocked?'입고/자재 이슈 연결':'자재/입고 직접 근거 없음',
      blocker, qualityActive, progress:progressOf(p.progressText), progressText:p.progressText||null,
      dueDays, latestEvent, openIssueCount:issues.length, changeCount:changes.length,
      source:'OS_V3_PRIVATE_RUNTIME'
    };
  });

  const issues = rawIssues.filter(i=>text(i.status).toUpperCase()!=='CLOSED').map(i => {
    const linked = projects.find(p=>idMatches(text(i.projectId),p.id));
    const type=text(i.type);
    let severity='MEDIUM';
    if (/QUALITY/.test(type)) severity='HIGH';
    if (/DELAY/.test(type) && linked?.dueDays!==null && linked?.dueDays<=7) severity='CRITICAL';
    return {
      id:i.id, projectId:i.projectId, type, severity, status:text(i.status)||'OPEN',
      process:i.process||null, cause:i.note || `${i.process||''} ${type}`.trim(),
      nextAction:/QUALITY/.test(type)?'수정/재검증 완료 후 다음 Gate 승인':'원인 해소일과 후속 일정 영향 확인',
      decisionRequired:severity==='CRITICAL'||/QUALITY/.test(type), source:'OS_V3_PRIVATE_RUNTIME'
    };
  });

  function projectById(id){ return projects.find(p=>p.id===id); }
  function openIssues(){ return issues; }
  function decisions(){
    const rows=issues.filter(i=>i.decisionRequired).map(i=>{
      const p=projectById(i.projectId);
      return {...i,project:p||null,title:p?`${p.customer} · ${p.model}`:i.projectId,decision:`${i.cause} — ${i.nextAction}`};
    });
    const nextCap=(rawCapacity||[]).filter(c=>dateOnly(c.date)>=AS_OF && Number(c.gap||0)<0)
      .sort((a,b)=>text(a.date).localeCompare(text(b.date)))[0];
    if(nextCap){
      rows.push({
        id:`CAPA-${nextCap.date}`,projectId:null,type:'RESOURCE_CAPA',
        severity:Number(nextCap.gap)<=-3?'CRITICAL':'HIGH',status:'OPEN',process:'인력',
        cause:nextCap.summary||`가용 ${nextCap.availableFTE} / 계획 ${nextCap.demandFTE} FTE`,
        nextAction:'작업 우선순위·지원인력·일정 영향 확인',decisionRequired:Boolean(nextCap.decisionRequired),
        title:`생산B팀 CAPA · ${nextCap.date}`,decision:`${nextCap.summary||''} — 작업 우선순위·지원인력·일정 영향 확인`,
        source:'OS_V3_PRIVATE_RUNTIME'
      });
    }
    return rows.sort((a,b)=>severityRank(a.severity)-severityRank(b.severity));
  }
  function metrics(){
    const todayEvents=rawEvents.filter(e=>dateOnly(e.date)===AS_OF && ['일일작업','ACTUAL'].includes(text(e.type)||text(e.lawTag)));
    const cap=(rawCapacity||[]).find(c=>dateOnly(c.date)===AS_OF);
    return {
      todayWork:todayEvents.length,
      urgent:projects.filter(p=>p.risk==='긴급').length,
      issues:issues.length,
      blocked:projects.filter(p=>p.assemblyReady==='BLOCKED').length,
      activeProjects:projects.length,
      capacityGap:cap?Number(cap.gap||0):null
    };
  }
  function toLegacy(p){
    return {
      grade:p.risk,job:p.id,customer:p.customer,device:p.model,
      purchase:p.supplyStatus,slack:p.assemblyReady,state:p.state,inspection:p.inspection,
      shipment:p.shipmentPlan||p.customerDueDate||'출고일 미확정',reason:p.blocker||p.riskReason,pm:p.pm,
      assemblyReady:p.assemblyReady,quality:p.qualityActive,nextGate:p.nextGate,core:true,
      riskReason:p.riskReason,progress:p.progress,source:p.source
    };
  }
  function currentCapacity(){
    return (rawCapacity||[]).filter(c=>dateOnly(c.date)>=AS_OF).sort((a,b)=>text(a.date).localeCompare(text(b.date))).slice(0,7);
  }
  function sourceHealth(){
    return {
      mode:'private-runtime',label:'OS v3 PRIVATE',asOf:AS_OF,
      generatedAt:snapshot?.meta?.generatedAt||null,
      counts:{projects:projects.length,events:rawEvents.length,issues:issues.length,changes:rawChanges.length},
      runtimeDirectGoogleRead:false,privateRuntimeSource:true,writeEnabled:false
    };
  }
  return {
    AS_OF,projects,events:rawEvents,issues,changes:rawChanges,capacity:rawCapacity,
    projectById,openIssues,decisions,metrics,toLegacy,currentCapacity,sourceHealth,
    activeProjects:()=>projects
  };
}

function fromReference() {
  return {
    ...reference,
    changes:[],
    capacity:[],
    activeProjects:()=>reference.projects,
    currentCapacity:()=>[],
    sourceHealth:()=>({
      mode:'reference-snapshot',label:'REFERENCE',asOf:reference.AS_OF,
      generatedAt:null,
      counts:{projects:reference.projects.length,events:reference.events.length,issues:reference.issues.length,changes:0},
      runtimeDirectGoogleRead:false,privateRuntimeSource:false,writeEnabled:false,
      warning: privateSource?.__error ? `Private source parse error: ${privateSource.__error}` : 'Private OS v3 runtime source is not configured.'
    })
  };
}

module.exports = privateSource && !privateSource.__error ? fromPrivate(privateSource) : fromReference();
