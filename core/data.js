const AS_OF = '2026-09-10';

const projects = [
  {
    id:'LAB-260109K-004', customer:'데모기', model:'APM-20K (연속순환믹서)', pm:'이기환',
    risk:'주의', stage:'ASSEMBLY', state:'조립', nextGate:'전장', assemblyReady:'BLOCKED',
    customerDueDate:'2026-09-16', shipmentPlan:'2026-09-16', inspection:'검수 전 단계',
    supplyStatus:'세니타리 입고대기', blocker:'세니타리 입고대기 · 자재수령 OPEN 이슈',
    qualityActive:false, plannedToday:true, source:'V3_NORMALIZED_SNAPSHOT'
  },
  {
    id:'260626A-046', customer:'한국재료연구원', model:'KRM-100D2', pm:'조나단',
    risk:'주의', stage:'ELECTRICAL', state:'전장 진행', nextGate:'프로그램/테스트', assemblyReady:'READY',
    customerDueDate:'2026-09-20', shipmentPlan:'2026-09-18', inspection:'검수 전 단계',
    supplyStatus:'구매 진행 · 전장품 입고지연 이력', blocker:'전장업체 전장품 입고 지연 · 전장 일정 변경 이력',
    qualityActive:false, plannedToday:true, source:'V3_NORMALIZED_SNAPSHOT'
  },
  {
    id:'260710A-052', customer:'미코', model:'KDM-150', pm:'서정완',
    risk:'주의', stage:'ASSEMBLY', state:'마감 조립 진행', nextGate:'전장', assemblyReady:'READY',
    customerDueDate:'2026-10-30', shipmentPlan:'2026-10-30', inspection:'검수 전 단계',
    supplyStatus:'구매 · 일정 적합', blocker:'82D 끼임 / 36D 동심 문제 · 수정 반출 및 외주 실조립 확인 필요',
    qualityActive:true, plannedToday:true, source:'V3_NORMALIZED_SNAPSHOT'
  },
  {
    id:'260708A-051', customer:'오랜드바이오', model:'PDM-300C', pm:'서정완',
    risk:'주의', stage:'REWORK', state:'오링 보완 후 재확인', nextGate:'재검증/검수', assemblyReady:'BLOCKED',
    customerDueDate:'2026-09-18', shipmentPlan:'2026-09-18', inspection:'검수 전 단계',
    supplyStatus:'입고 지연 재확인', blocker:'자전컵·컵 공차 소음 · 오링단 가공 후 재검증 필요',
    qualityActive:true, plannedToday:false, source:'V3_NORMALIZED_SNAPSHOT'
  },
  {
    id:'260601A-039-01', customer:'트루메카(대덕전자)', model:'PDM-1KV-A', pm:'김재석',
    risk:'협의', stage:'INSPECTION_COMPLETE', state:'완성품 검수완료', nextGate:'출고 승인', assemblyReady:'READY',
    customerDueDate:null, shipmentPlan:null, inspection:'완성품 검수완료',
    supplyStatus:'구매 완료 · 생산DB 진척 93%', blocker:'고객사 연기 / PM 협의 · 출고일 미확정',
    qualityActive:false, plannedToday:false, source:'V3_NORMALIZED_SNAPSHOT'
  },
  {
    id:'260601A-039-02', customer:'트루메카(대덕전자)', model:'PDM-1KV-A', pm:'김재석',
    risk:'협의', stage:'INSPECTION_COMPLETE', state:'완성품 검수완료', nextGate:'출고 승인', assemblyReady:'READY',
    customerDueDate:null, shipmentPlan:null, inspection:'완성품 검수완료',
    supplyStatus:'구매 완료 · 생산DB 진척 93%', blocker:'고객사 연기 / PM 협의 · 출고일 미확정',
    qualityActive:false, plannedToday:false, source:'V3_NORMALIZED_SNAPSHOT'
  },
  {
    id:'260727A-060-01', customer:'재고(SIC) → LG화학', model:'KRM-50B', pm:'조나단',
    risk:'긴급', stage:'PRE_PRODUCTION', state:'생산전', nextGate:'조립 착수', assemblyReady:'BLOCKED',
    customerDueDate:'2026-09-30', shipmentPlan:'2026-09-30', inspection:'검수 전 단계',
    supplyStatus:'구매 진행 · 예정 09/11', blocker:'핵심 자재 입고 후 실제 생산 가능기간 확인 필요',
    qualityActive:false, plannedToday:false, source:'V3_NORMALIZED_SNAPSHOT'
  },
  {
    id:'260714A-054', customer:'코스모스랩', model:'DCM-20K', pm:'김형섭',
    risk:'긴급', stage:'PRE_PRODUCTION', state:'생산전', nextGate:'자재확보/조립 착수', assemblyReady:'BLOCKED',
    customerDueDate:'2026-10-14', shipmentPlan:'2026-10-14', inspection:'검수 전 단계',
    supplyStatus:'구매 진행 · 예정 09/20', blocker:'설계·구매 지연 누적 · 생산여유 축소',
    qualityActive:false, plannedToday:false, source:'V3_NORMALIZED_SNAPSHOT'
  },
  {
    id:'260724A-059', customer:'나노실리칸첨단소재', model:'KMCLF-120', pm:'서정완',
    risk:'긴급', stage:'PRE_PRODUCTION', state:'생산전', nextGate:'구매확정/조립 가능일 확정', assemblyReady:'BLOCKED',
    customerDueDate:'2026-10-22', shipmentPlan:'2026-10-22', inspection:'검수 전 단계',
    supplyStatus:'구매 미확정', blocker:'구매 미확정 · 실제 조립 가능일 미확정',
    qualityActive:false, plannedToday:false, source:'V3_NORMALIZED_SNAPSHOT'
  }
];

const events = [
  {id:'EV-20260907-011', date:'2026-09-07', projectId:'LAB-260109K-004', type:'DELAY_CAUSE', process:'자재수령', summary:'세니타리 입고대기', source:'업무이력'},
  {id:'EV-20260907-013', date:'2026-09-07', projectId:'260626A-046', type:'PLAN_CHANGE', process:'전장', summary:'전장 일정 9/9로 연기', cause:'전장업체 전장품 입고 지연', source:'업무이력'},
  {id:'EV-20260909-KRM', date:'2026-09-09', projectId:'260626A-046', type:'ACTUAL', process:'전장', summary:'전장 진행', planDeltaDays:2, source:'업무이력'},
  {id:'EV-20260907-014', date:'2026-09-07', projectId:'260710A-052', type:'QUALITY_ISSUE', process:'조립', summary:'43D/26D/82D 조립간 끼임 및 36D 도어샤프트블럭 동심 문제', source:'업무이력'},
  {id:'EV-20260909-MIKO', date:'2026-09-09', projectId:'260710A-052', type:'ACTUAL', process:'조립', summary:'마감 조립 진행', planDeltaDays:1, source:'업무이력'},
  {id:'EV-20260907-OLAND', date:'2026-09-07', projectId:'260708A-051', type:'QUALITY_ISSUE', process:'가공/외주', summary:'자전컵·컵 공차 소음 · 오링단 가공 후 재확인', source:'업무이력'},
  {id:'EV-20260908-TRUEMECA', date:'2026-09-08', projectId:'260601A-039-*', type:'DELAY_CAUSE', process:'자재수령', summary:'자전컵 커버 입고일 2일 연기', cause:'한신정밀 외주입고 지연', source:'업무이력'}
];

const issues = [
  {id:'IS-LAB-SANITARY', projectId:'LAB-260109K-004', type:'SUPPLY', severity:'HIGH', status:'OPEN', process:'자재수령', cause:'세니타리 입고대기', nextAction:'입고 확정일 확인 후 조립/전장 순서 재검토', decisionRequired:false},
  {id:'IS-KRM-ELEC', projectId:'260626A-046', type:'SCHEDULE', severity:'HIGH', status:'MONITOR', process:'전장', cause:'전장업체 전장품 입고 지연', nextAction:'전장 완료 후 테스트/FAT 보호시간 재계산', decisionRequired:false},
  {id:'IS-MIKO-FIT', projectId:'260710A-052', type:'QUALITY', severity:'HIGH', status:'OPEN', process:'조립', cause:'끼임·동심 문제', nextAction:'수정품 실조립/재검증 후 전장 Gate 승인', decisionRequired:true},
  {id:'IS-OLAND-NOISE', projectId:'260708A-051', type:'QUALITY', severity:'HIGH', status:'OPEN', process:'가공/외주', cause:'자전컵·컵 공차 소음', nextAction:'오링단 가공품 재검증 후 완료 판정', decisionRequired:true},
  {id:'IS-LG-MATERIAL', projectId:'260727A-060-01', type:'SUPPLY', severity:'CRITICAL', status:'OPEN', process:'구매/입고', cause:'핵심 자재 입고 대기', nextAction:'입고 후 실제 조립 가능일과 생산기간 확인', decisionRequired:true},
  {id:'IS-COSMOS-SLACK', projectId:'260714A-054', type:'SCHEDULE', severity:'CRITICAL', status:'OPEN', process:'설계/구매', cause:'설계·구매 지연 누적', nextAction:'생산 순서 재배치 또는 납기 협의 필요성 판단', decisionRequired:true},
  {id:'IS-NANO-PURCHASE', projectId:'260724A-059', type:'SUPPLY', severity:'CRITICAL', status:'OPEN', process:'구매', cause:'구매 미확정', nextAction:'구매 확정일/조립 가능일 확보', decisionRequired:true},
  {id:'IS-TRUEMECA-DUE', projectId:'260601A-039-01', type:'CUSTOMER_SCHEDULE', severity:'MEDIUM', status:'OPEN', process:'출고', cause:'고객사 일정 연기', nextAction:'PM 협의 후 운영기준 출고일 확정', decisionRequired:true}
];

function projectById(id){ return projects.find(p=>p.id===id); }
function openIssues(){ return issues.filter(i=>i.status!=='CLOSED'); }
function decisions(){
  return openIssues().filter(i=>i.decisionRequired).map(i=>({
    ...i,
    project:projectById(i.projectId),
    title:`${projectById(i.projectId)?.customer||i.projectId} · ${projectById(i.projectId)?.model||''}`.trim(),
    decision:`${i.cause} — ${i.nextAction}`
  })).sort((a,b)=>({CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3}[a.severity]-({CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3}[b.severity])));
}
function metrics(){
  return {
    todayWork:projects.filter(p=>p.plannedToday).length,
    urgent:projects.filter(p=>p.risk==='긴급').length,
    issues:openIssues().length,
    blocked:projects.filter(p=>p.assemblyReady==='BLOCKED').length
  };
}
function toLegacy(p){
  return {
    grade:p.risk, job:p.id, customer:p.customer, device:p.model,
    purchase:p.supplyStatus, slack:p.assemblyReady==='BLOCKED'?'입고/조건 확인 필요':'공정 진행 가능',
    state:p.state, inspection:p.inspection,
    shipment:p.shipmentPlan||p.customerDueDate||'출고일 미확정', reason:p.blocker, pm:p.pm,
    assemblyReady:p.assemblyReady, quality:p.qualityActive, nextGate:p.nextGate, core:true
  };
}

module.exports={AS_OF,projects,events,issues,projectById,openIssues,decisions,metrics,toLegacy};
