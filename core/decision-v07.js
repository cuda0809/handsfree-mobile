// HandsFree Mobile REAL 0.7 — automatic field decision engine.
// Derives Risk / Today Work / BLOCKED / Next Gate / D-Day from the canonical read model.
function text(v){return String(v??'').trim();}
function dateOnly(v){const s=text(v);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;}
function numberOrNull(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function dayDiff(future,base){if(!future||!base)return null;return Math.ceil((new Date(future+'T00:00:00+09:00')-new Date(base+'T00:00:00+09:00'))/86400000);}
function matchProject(pattern,id){if(!pattern||!id)return false;if(pattern===id)return true;if(String(pattern).endsWith('*'))return String(id).startsWith(String(pattern).slice(0,-1));return false;}
function rankRisk(v){return ({'안정':0,'주의':1,'긴급':2,'협의':3}[v]??0);}
function maxRisk(a,b){if(a==='협의'||b==='협의')return '협의';return rankRisk(a)>=rankRisk(b)?a:b;}
function issueTypeOf(e){return text(e.issueType).toUpperCase();}
function isOpenIssue(e){return e.eventType==='ISSUE_OPEN'&&text(e.status).toUpperCase()!=='CLOSED';}
function isWorkEvent(e){return ['일일작업','ACTUAL','출고완료','DELIVERY'].includes(text(e.eventType));}
function processRank(p){const order=['자재수령','자재/입고','외주입고','가공/외주','조립','전장','프로그램','테스트','검수','출고'];const i=order.indexOf(text(p));return i<0?99:i;}
function nextAfter(process){const p=text(process);if(/자재|입고|가공|외주/.test(p))return '조립';if(/조립/.test(p))return '전장';if(/전장/.test(p))return '프로그램/테스트';if(/프로그램/.test(p))return '테스트';if(/테스트/.test(p))return '검수';if(/검수/.test(p))return '출고 승인';if(/출고/.test(p))return '완료';return '다음 공정 확인';}
function normalizeGrade(v){const s=text(v);return ['긴급','주의','협의','안정'].includes(s)?s:null;}
function dueLabel(days,due){if(days===null)return due&&/연기|협의|미정/.test(text(due))?'납기 협의':'D-Day 미확정';if(days===0)return 'D-DAY';return days>0?`D-${days}`:`D+${Math.abs(days)}`;}
function latest(rows){return [...rows].filter(r=>r.occurredAt).sort((a,b)=>text(a.occurredAt).localeCompare(text(b.occurredAt))).at(-1)||null;}

function buildDecisions(canonical){
  const asOf=dateOnly(canonical?.meta?.asOf)||new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  const capacity=canonical?.views?.capacity||[];
  const results=[];
  for(const p of (canonical?.projectMaster||[]).filter(x=>x.active)){
    const id=p.projectId;
    const events=(canonical.eventLog||[]).filter(e=>matchProject(text(e.projectId),id));
    const openIssues=events.filter(isOpenIssue);
    const workEvents=events.filter(isWorkEvent);
    const latestWork=latest(workEvents);
    const capRows=capacity.filter(c=>matchProject(text(c.projectId),id));
    const todayCap=capRows.filter(c=>dateOnly(c.date)===asOf);
    const futureCap=capRows.filter(c=>dateOnly(c.date)&&c.date>=asOf).sort((a,b)=>text(a.date).localeCompare(text(b.date))||processRank(a.process)-processRank(b.process));
    const todayEvent=workEvents.some(e=>dateOnly(e.occurredAt)===asOf);
    const todayWork=todayEvent||todayCap.length>0;

    const qualityIssues=openIssues.filter(e=>/QUALITY/.test(issueTypeOf(e)));
    const delayIssues=openIssues.filter(e=>/DELAY|SUPPLY|INBOUND/.test(issueTypeOf(e))||/입고대기|자재.*대기|지연/.test(text(e.summary)));
    const blocked=qualityIssues.length>0||delayIssues.length>0;
    const blockType=qualityIssues.length?'QUALITY':delayIssues.length?'SUPPLY/DELAY':null;

    const due=dateOnly(p.due);
    const dueDays=dayDiff(due,asOf);
    const customerHold=/고객사\s*연기|PM\s*협의|납기\s*미정/.test(`${text(p.due)} ${text(p.status)} ${text(p.note)}`);
    const analysisGrade=normalizeGrade(p.analysis?.grade);
    const slack=numberOrNull(p.analysis?.productionSlackDays);
    const analysisAge=numberOrNull(canonical?.meta?.analysisAgeDays);

    let risk='안정';
    const reasons=[];
    if(customerHold){risk='협의';reasons.push('고객사 일정 연기/PM 협의');}
    else{
      if(analysisGrade){risk=maxRisk(risk,analysisGrade);reasons.push(`90일분석 ${analysisGrade}${analysisAge!==null?`(${analysisAge}일 경과)`:''}`);}
      if(slack!==null&&slack<=14){risk=maxRisk(risk,'긴급');reasons.push(`생산여유 ${slack}일`);}
      else if(slack!==null&&slack<=21){risk=maxRisk(risk,'주의');reasons.push(`생산여유 ${slack}일`);}
      if(dueDays!==null&&dueDays<0){risk=maxRisk(risk,'긴급');reasons.push(`납기 ${Math.abs(dueDays)}일 경과`);}
      else if(dueDays!==null&&dueDays<=7){risk=maxRisk(risk,blocked?'긴급':'주의');reasons.push(`납기 ${dueDays}일`);}
      else if(dueDays!==null&&dueDays<=14){risk=maxRisk(risk,'주의');reasons.push(`납기 ${dueDays}일`);}
      if(blocked){risk=maxRisk(risk,dueDays!==null&&dueDays<=14?'긴급':'주의');reasons.push(`${blockType} OPEN 이슈 ${openIssues.length}건`);}
      const highCap=todayCap.some(c=>/HIGH|OVERLOAD/.test(text(c.risk).toUpperCase())||Number(c.shortageFTE)>0||Number(c.gap)<0);
      if(highCap){risk=maxRisk(risk,'주의');reasons.push('오늘 인력 CAPA 부족/과부하');}
    }

    const currentProcess=text(latestWork?.process)||text(p.analysis?.productionStatus)||text(p.status)||'상태 확인';
    let nextGate='다음 공정 확인';
    const futureDifferent=futureCap.find(c=>text(c.process)&&text(c.process)!==text(currentProcess));
    if(futureDifferent)nextGate=text(futureDifferent.process);
    else if(futureCap[0]?.process)nextGate=text(futureCap[0].process);
    else nextGate=nextAfter(currentProcess);
    if(blocked)nextGate=qualityIssues.length?'수정/재검증 후 '+nextGate:'입고/지연 해소 후 '+nextGate;
    if(customerHold)nextGate='PM 일정 확정';

    const state=blocked?(qualityIssues.length?'품질 재검증 대기':'자재/입고 해소 대기'):(todayWork?'오늘 작업':'진행');
    const decisionRequired=risk==='긴급'||(blocked&&risk!=='협의')||todayCap.some(c=>Number(c.shortageFTE)>=3);
    results.push({
      projectId:id,customer:p.customer,model:p.model,risk,riskReasons:reasons,due,dueDays,dDay:customerHold?'협의':dueLabel(dueDays,p.due),
      todayWork,todayEvidence:{event:todayEvent,capacityRows:todayCap.length},blocked,blockType,openIssueCount:openIssues.length,
      currentProcess,currentState:state,nextGate,decisionRequired,
      progress:{plan:p.progress?.plan??null,actual:p.progress?.actual??null},
      analysis:{grade:analysisGrade,productionSlackDays:slack,snapshotDate:p.analysis?.snapshotDate??null,ageDays:analysisAge},
      evidence:{latestWork:latestWork?{date:latestWork.occurredAt,type:latestWork.eventType,process:latestWork.process,summary:latestWork.summary}:null,todayCapacity:todayCap.slice(0,3).map(c=>({date:c.date,process:c.process,risk:c.risk,shortageFTE:c.shortageFTE,summary:c.summary}))}
    });
  }
  const metrics={
    active:results.length,todayWork:results.filter(r=>r.todayWork).length,urgent:results.filter(r=>r.risk==='긴급').length,
    caution:results.filter(r=>r.risk==='주의').length,consult:results.filter(r=>r.risk==='협의').length,blocked:results.filter(r=>r.blocked).length,
    decisions:results.filter(r=>r.decisionRequired).length
  };
  return {schema:'REAL_DECISION_V1',asOf,writeLocked:true,metrics,projects:results};
}
module.exports={buildDecisions};
