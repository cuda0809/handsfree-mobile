// HandsFree Mobile REAL 0.3.2 — source-normalization factory.
// Operational data may come from Google Sheets live read or a private runtime snapshot.
// Public repository code contains no new OS v3 operational export.

const reference = require('./data');

function idMatches(pattern, id) {
  if (!pattern || !id) return false;
  if (pattern === id) return true;
  if (String(pattern).endsWith('*')) return String(id).startsWith(String(pattern).slice(0, -1));
  if (String(id).endsWith('*')) return String(pattern).startsWith(String(id).slice(0, -1));
  return false;
}
function text(v) { return String(v ?? '').trim(); }
function boolish(v) {
  if (typeof v === 'boolean') return v;
  const s = text(v).toUpperCase();
  if (['TRUE','1','Y','YES'].includes(s)) return true;
  if (['FALSE','0','N','NO'].includes(s)) return false;
  return null;
}
function kstToday() { return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); }
function dateOnly(v) {
  if (typeof v === 'number' && Number.isFinite(v) && v > 20000) {
    const unixMs = Math.round((v - 25569) * 86400000);
    return new Date(unixMs).toISOString().slice(0, 10);
  }
  const s = text(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4})[./년 -]+(\d{1,2})[./월 -]+(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  return null;
}
function progressOf(v) {
  const m = text(v).match(/(\d{1,3})%/);
  return m ? Math.max(0, Math.min(100, Number(m[1]))) : null;
}
function activeProject(p) {
  const status = text(p.status).replace(/\s/g,'');
  return !['완료','출고완료','납품완료'].includes(status);
}
function joins(list, projectId, field='projectId') {
  return (list || []).filter(row => idMatches(text(row[field]), projectId));
}
function severityRank(v) { return ({CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3}[v] ?? 9); }
function severityFromPriority(priority, fallback='MEDIUM') {
  const p=text(priority).toUpperCase();
  if (p.includes('CRITICAL')) return 'CRITICAL';
  if (p.includes('HIGH')) return 'HIGH';
  if (p.includes('MEDIUM')) return 'MEDIUM';
  if (p.includes('LOW')) return 'LOW';
  return fallback;
}
function inferNextGate(state) {
  const s=text(state);
  if (/출고|납품완료/.test(s)) return '완료';
  if (/검수완료/.test(s)) return '출고 승인';
  if (/검수/.test(s)) return '검수 완료';
  if (/테스트|FAT/.test(s)) return '검수/FAT';
  if (/프로그램/.test(s)) return '테스트';
  if (/전장/.test(s)) return '프로그램/테스트';
  if (/조립|보완|재작업/.test(s)) return '전장';
  if (/자재|입고|생산전/.test(s)) return '자재확보/조립 착수';
  return '다음 공정 확인';
}

function buildCore(snapshot, sourceMeta={}) {
  const AS_OF = dateOnly(snapshot?.meta?.asOf) || kstToday();
  const rawEvents = Array.isArray(snapshot?.events) ? snapshot.events : [];
  const rawIssues = Array.isArray(snapshot?.issues) ? snapshot.issues : [];
  const rawChanges = Array.isArray(snapshot?.changes) ? snapshot.changes : [];
  const rawCapacity = Array.isArray(snapshot?.capacity) ? snapshot.capacity : [];
  const rawBriefing = Array.isArray(snapshot?.briefing) ? snapshot.briefing : [];
  const allProjects = Array.isArray(snapshot?.projects) ? snapshot.projects : [];

  function briefingForIssue(issue) {
    return [...rawBriefing].filter(b => {
      const sameProject = idMatches(text(b.projectId), text(issue.projectId));
      const sameType = text(b.lawTag) === text(issue.type) || text(b.type) === text(issue.type);
      const sameProcess = text(b.process) && text(issue.process) && text(b.process) === text(issue.process);
      return sameProject && (sameType || sameProcess);
    }).sort((a,b)=>text(a.date).localeCompare(text(b.date))).at(-1) || null;
  }

  const projects = allProjects.filter(activeProject).map(p => {
    const events = joins(rawEvents, p.id);
    const issues = joins(rawIssues, p.id).filter(i => text(i.status).toUpperCase() !== 'CLOSED');
    const changes = joins(rawChanges, p.id);
    const capacityRows = joins(rawCapacity, p.id);
    const actuals = events.filter(e => ['일일작업','출고완료','A/S','PT'].includes(text(e.type)) || ['ACTUAL','DELIVERY'].includes(text(e.lawTag)));
    const latestEvent = [...actuals].sort((a,b)=>text(a.date).localeCompare(text(b.date))).at(-1) || null;
    const qualityActive = issues.some(i => /QUALITY/.test(text(i.type)));
    const supplyBlocked = issues.some(i => /DELAY|SUPPLY|INBOUND/.test(text(i.type)) || /자재|입고|외주/.test(text(i.process)));
    const progress = progressOf(p.progressText);
    const state = latestEvent?.summary || text(p.status) || (progress === 0 ? '생산전' : '진행상태 확인');
    const productionStarted = Boolean(latestEvent) || (progress !== null && progress > 0) || /조립|전장|프로그램|테스트|검수|완료/.test(state);
    let assemblyReady = supplyBlocked ? 'BLOCKED' : productionStarted ? 'READY' : 'UNKNOWN';
    if (['PM협의','완성품검수완료'].includes(text(p.status).replace(/\s/g,''))) assemblyReady = 'READY';
    const flowBlocked = supplyBlocked || qualityActive;
    const due = dateOnly(p.due);
    const dueDays = due ? Math.ceil((new Date(due+'T00:00:00+09:00') - new Date(AS_OF+'T00:00:00+09:00')) / 86400000) : null;
    let risk = '안정';
    if (/PM협의|고객사연기/.test(text(p.status)+text(p.due))) risk = '협의';
    else if (flowBlocked || (dueDays !== null && dueDays <= 14)) risk = '주의';
    if (dueDays !== null && dueDays <= 7 && flowBlocked) risk = '긴급';
    const nextGate = inferNextGate(state);
    const blocker = issues.map(i => i.note || i.cause || i.type || i.process).filter(Boolean).slice(0,4).join(' · ');
    const plannedToday = capacityRows.some(c => dateOnly(c.date) === AS_OF);
    return {
      id:p.id, customer:p.customer, model:p.model, pm:p.pm || null,
      sales:p.sales || null, design:p.design || null, production:p.production || [],
      risk, riskReason:blocker || (dueDays !== null ? `납기 D${dueDays>=0?'-':'+'}${Math.abs(dueDays)}` : '직접 근거 확인'),
      stage:text(latestEvent?.process) || null, state, nextGate, assemblyReady, flowBlocked,
      customerDueDate:due, shipmentPlan:due,
      inspection:/검수/.test(state) ? state : '검수 전 단계',
      supplyStatus:supplyBlocked ? '입고/자재 이슈 연결' : assemblyReady==='READY' ? '조립 준비조건 충족' : '자재/입고 직접 근거 확인 필요',
      blocker, qualityActive, progress, progressText:p.progressText || null,
      dueDays, latestEvent, openIssueCount:issues.length, changeCount:changes.length, plannedToday,
      source:sourceMeta.projectSource || sourceMeta.label || 'OS_V3'
    };
  });

  const issues = rawIssues.filter(i => text(i.status).toUpperCase() !== 'CLOSED').map(i => {
    const linked = projects.find(p => idMatches(text(i.projectId), p.id));
    const type = text(i.type);
    const briefing = briefingForIssue(i);
    let severity = 'MEDIUM';
    if (/QUALITY/.test(type)) severity = 'HIGH';
    else if (/DELAY|SUPPLY|INBOUND/.test(type)) severity = 'HIGH';
    if (/DELAY|SUPPLY|INBOUND/.test(type) && linked?.dueDays !== null && linked?.dueDays <= 7) severity = 'CRITICAL';
    severity = severityFromPriority(briefing?.priority, severity);
    const explicitDecision = boolish(i.decisionRequired);
    const sourceDecision = briefing ? boolish(briefing.decisionRequired) : null;
    const decisionRequired = explicitDecision !== null ? explicitDecision : sourceDecision !== null ? sourceDecision : severity === 'CRITICAL';
    return {
      ...i, id:i.id, projectId:i.projectId, type, severity,
      status:text(i.status) || 'OPEN', process:i.process || null,
      cause:i.note || i.cause || briefing?.summary || `${i.process||''} ${type}`.trim(),
      nextAction:i.nextAction || (/QUALITY/.test(type) ? '수정/재검증 완료 후 다음 Gate 승인' : '원인 해소일과 후속 일정 영향 확인'),
      decisionRequired, decisionEvidence:briefing ? {date:briefing.date,priority:briefing.priority,analysis:briefing.analysis,source:briefing.source} : null,
      source:sourceMeta.issueSource || sourceMeta.label || 'OS_V3'
    };
  });

  function projectById(id) { return projects.find(p => p.id === id) || projects.find(p => idMatches(id, p.id)) || null; }
  function openIssues() { return issues; }

  function capacityDays() {
    const byDate = new Map();
    for (const row of rawCapacity) {
      const date = dateOnly(row.date); if (!date) continue;
      const current = byDate.get(date);
      if (!current || Number(row.gap ?? 0) < Number(current.gap ?? 0)) byDate.set(date, {...row,date});
    }
    return [...byDate.values()].map(row => {
      const b = [...rawBriefing].filter(x => dateOnly(x.date)===row.date && (text(x.lawTag)==='RESOURCE_CAPA' || text(x.type)==='인력CAPA')).at(-1) || null;
      const decision = b ? boolish(b.decisionRequired) : boolish(row.decisionRequired);
      return {
        ...row,
        severity:severityFromPriority(b?.priority, Number(row.gap||0)<=-3?'CRITICAL':Number(row.gap||0)<0?'HIGH':'LOW'),
        decisionRequired:decision===null?false:decision,
        decisionEvidence:b ? {priority:b.priority,analysis:b.analysis,source:b.source} : null,
        summary:b?.summary || row.summary || `가용 ${row.availableFTE??'-'} / 계획 ${row.demandFTE??'-'} FTE`
      };
    }).sort((a,b)=>text(a.date).localeCompare(text(b.date)));
  }

  function decisions() {
    const rows = issues.filter(i=>i.decisionRequired).map(i => {
      const p = projectById(i.projectId);
      return {...i, project:p, title:p ? `${p.customer} · ${p.model}` : i.projectId, decision:`${i.cause} — ${i.nextAction}`};
    });
    const capRows = capacityDays().filter(c => c.date >= AS_OF && c.decisionRequired).slice(0,3);
    for (const cap of capRows) {
      rows.push({
        id:`CAPA-${cap.date}`, projectId:null, type:'RESOURCE_CAPA',
        severity:cap.severity || 'HIGH', status:'OPEN', process:'인력',
        cause:cap.summary || `가용 ${cap.availableFTE} / 계획 ${cap.demandFTE} FTE`,
        nextAction:'작업 우선순위·지원인력·일정 영향 확인', decisionRequired:true,
        title:`생산B팀 CAPA · ${cap.date}`, decision:`${cap.summary || ''} — 작업 우선순위·지원인력·일정 영향 확인`,
        source:sourceMeta.capacitySource || sourceMeta.label || 'OS_V3', decisionEvidence:cap.decisionEvidence || null
      });
    }
    return rows.sort((a,b)=>severityRank(a.severity)-severityRank(b.severity));
  }
  function metrics() {
    const todayPlanIds = [...new Set(rawCapacity.filter(c => dateOnly(c.date) === AS_OF && text(c.projectId)).map(c=>text(c.projectId)))];
    const todayEvents = rawEvents.filter(e => dateOnly(e.date) === AS_OF && (['일일작업','ACTUAL'].includes(text(e.type)) || text(e.lawTag) === 'ACTUAL'));
    const cap = capacityDays().find(c => c.date === AS_OF);
    return {
      todayWork:todayPlanIds.length || todayEvents.length,
      actualToday:todayEvents.length,
      urgent:projects.filter(p=>p.risk==='긴급').length,
      issues:issues.length,
      blocked:projects.filter(p=>p.flowBlocked).length,
      assemblyBlocked:projects.filter(p=>p.assemblyReady==='BLOCKED').length,
      activeProjects:projects.length,
      capacityGap:cap ? Number(cap.gap || 0) : null
    };
  }
  function toLegacy(p) {
    return {
      grade:p.risk, job:p.id, customer:p.customer, device:p.model, purchase:p.supplyStatus,
      slack:p.assemblyReady, state:p.state, inspection:p.inspection,
      shipment:p.shipmentPlan || p.customerDueDate || '출고일 미확정', reason:p.blocker || p.riskReason, pm:p.pm,
      assemblyReady:p.assemblyReady, flowBlocked:p.flowBlocked, quality:p.qualityActive, nextGate:p.nextGate, core:true,
      riskReason:p.riskReason, progress:p.progress, plannedToday:p.plannedToday, source:p.source
    };
  }
  function currentCapacity() {
    return capacityDays().filter(c => c.date >= AS_OF).slice(0,7);
  }
  function sourceHealth() {
    return {
      mode:sourceMeta.mode || 'private-runtime', label:sourceMeta.label || 'OS v3 PRIVATE', asOf:AS_OF,
      fetchedAt:sourceMeta.fetchedAt || snapshot?.meta?.generatedAt || null, generatedAt:snapshot?.meta?.generatedAt || null,
      counts:{projects:projects.length,allProjects:allProjects.length,events:rawEvents.length,issues:issues.length,changes:rawChanges.length,capacity:rawCapacity.length,briefing:rawBriefing.length},
      runtimeDirectGoogleRead:Boolean(sourceMeta.runtimeDirectGoogleRead), privateRuntimeSource:Boolean(sourceMeta.privateRuntimeSource),
      writeEnabled:false, auth:sourceMeta.auth || null, warning:sourceMeta.warning || null
    };
  }
  return {AS_OF,projects,events:rawEvents,issues,changes:rawChanges,capacity:rawCapacity,briefing:rawBriefing,projectById,openIssues,decisions,metrics,toLegacy,currentCapacity,sourceHealth,activeProjects:()=>projects};
}

function buildReference(warning='Private OS v3 runtime source is not configured.') {
  return {
    ...reference, changes:[], capacity:[], briefing:[], activeProjects:()=>reference.projects, currentCapacity:()=>[],
    sourceHealth:()=>({
      mode:'reference-snapshot',label:'REFERENCE',asOf:reference.AS_OF,fetchedAt:null,generatedAt:null,
      counts:{projects:reference.projects.length,allProjects:reference.projects.length,events:reference.events.length,issues:reference.issues.length,changes:0,capacity:0,briefing:0},
      runtimeDirectGoogleRead:false,privateRuntimeSource:false,writeEnabled:false,auth:null,warning
    })
  };
}
module.exports = { buildCore, buildReference, dateOnly, idMatches };
