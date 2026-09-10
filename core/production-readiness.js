// HandsFree Mobile REAL 0.4 — veteran production-readiness model.
// This layer NEVER invents physical completion. It turns existing evidence into conservative decision states.

function text(v){ return String(v ?? '').trim(); }
function numOrNull(v){ const n=Number(v); return v===null||v===undefined||v===''||!Number.isFinite(n) ? null : n; }
function dateText(v){ return text(v) || null; }
function isQuality(issue){ return /QUALITY/.test(text(issue?.type)) || /불량|품질|재검증|공차|끼임|동심|소음/.test([issue?.process,issue?.note,issue?.cause].map(text).join(' ')); }
function isSupply(issue){
  const type=text(issue?.type), process=text(issue?.process), body=[issue?.note,issue?.cause].map(text).join(' ');
  if(isQuality(issue)) return false;
  return /DELAY|SUPPLY|INBOUND/.test(type) || /자재|입고|외주입고|구매/.test(`${process} ${body}`);
}
function issueEvidence(issue){ return text(issue?.note) || text(issue?.cause) || text(issue?.resolution) || [issue?.process,issue?.type].map(text).filter(Boolean).join(' · ') || '상세 근거 확인 필요'; }
function hasCompletedTestEvidence(value){
  const s=text(value);
  return /(테스트|기능\s*시험|구동\s*시험|시운전|공회전|FAT)\s*(완료|합격|통과|OK|PASS)/i.test(s)
    || /(완료|합격|통과|OK|PASS)\s*(된|됨|처리)?\s*(테스트|기능\s*시험|구동\s*시험|시운전|공회전|FAT)/i.test(s);
}

function buildProductionReadiness(input={}){
  const issues=Array.isArray(input.issues)?input.issues:[];
  const qualityIssues=issues.filter(isQuality);
  const supplyIssues=issues.filter(isSupply);
  const analysis=input.analysis || null;
  const planConsumption=numOrNull(input.planProgress);
  const physicalCompletion=numOrNull(input.physicalCompletion);
  const assemblyReady=['READY','BLOCKED','UNKNOWN'].includes(input.assemblyReady)?input.assemblyReady:'UNKNOWN';
  const inspection=text(input.inspection || analysis?.finalInspection || '');
  const currentState=text(input.state || analysis?.productionStatus || '');
  const materialBlocked=assemblyReady==='BLOCKED';
  const blockingSupplyIssues=materialBlocked?supplyIssues:[];

  const criticalMaterials={
    status: assemblyReady,
    partLevelDataAvailable:false,
    blockingCount:blockingSupplyIssues.length,
    relatedIssueCount:supplyIssues.length,
    blockingEvidence:blockingSupplyIssues.map(issueEvidence).slice(0,5),
    relatedEvidence:supplyIssues.map(issueEvidence).slice(0,5),
    assemblyAvailableDate:dateText(analysis?.assemblyAvailableDate),
    purchaseStatus:text(analysis?.purchaseStatus) || null,
    note:materialBlocked
      ? (blockingSupplyIssues.length?'현재 조립을 막는 자재/외주입고 근거가 있어.':'조립 보류 상태지만 직접 자재 근거를 추가 확인해야 해.')
      : supplyIssues.length
        ? '자재/입고 관련 이력은 있지만 현재 조립 보류 근거로 확정하지 않아.'
        : '부품 단위 핵심자재 원장은 아직 연결되지 않았어.'
  };

  const qualityGate={
    status:qualityIssues.length?'REVERIFY_REQUIRED':'CLEAR',
    openCount:qualityIssues.length,
    evidence:qualityIssues.map(issueEvidence).slice(0,5),
    note:qualityIssues.length?'수정 완료 기록만으로 종료하지 않고 재검증 완료 근거가 필요해.':'현재 연결된 활성 품질 이슈는 없어.'
  };

  const inspectionDone=/완성품\s*검수완료|최종\s*검수완료|검수완료/.test(inspection) || /완성품\s*검수완료|최종\s*검수완료/.test(currentState);
  const testsEvidence=hasCompletedTestEvidence(`${currentState} ${inspection} ${text(analysis?.actualBasis)}`);
  const gateChecks=[
    {key:'material',label:'핵심 자재/외주입고',status:materialBlocked?'HOLD':assemblyReady==='READY'?'CLEAR':'VERIFY',evidence:criticalMaterials.blockingEvidence[0]||criticalMaterials.relatedEvidence[0]||criticalMaterials.purchaseStatus||criticalMaterials.note},
    {key:'quality',label:'품질 수정·재검증',status:qualityIssues.length?'HOLD':'CLEAR',evidence:qualityGate.evidence[0]||qualityGate.note},
    {key:'test',label:'구동·기능시험',status:testsEvidence?'EVIDENCE':'VERIFY',evidence:testsEvidence?`완료 근거: ${[currentState,inspection,text(analysis?.actualBasis)].filter(Boolean).join(' · ')}`:'구동·기능시험 완료를 직접 나타내는 근거 확인 필요'},
    {key:'inspection',label:'최종 검수',status:inspectionDone?'CLEAR':'VERIFY',evidence:inspection||'최종 검수 완료 근거 확인 필요'},
    {key:'approval',label:'출고 승인',status:'VERIFY',evidence:'별도 출고 승인 기록 연결 필요'}
  ];
  const hardHold=gateChecks.some(g=>g.status==='HOLD');
  const allOperationalClear=!hardHold && inspectionDone && assemblyReady==='READY' && qualityIssues.length===0;
  const shipmentGate={
    status:hardHold?'HOLD':allOperationalClear?'CANDIDATE':'VERIFY',
    label:hardHold?'출고 조건 보류':allOperationalClear?'출고 가능 후보':'출고 조건 확인',
    checks:gateChecks,
    reason:hardHold?'자재 또는 품질의 미해결 조건이 있어 출고 준비를 진행하기 전 해소가 필요해.':allOperationalClear?'현재 연결된 근거상 자재·품질·검수 조건은 충족했지만 시험 및 최종 출고 승인은 각각 직접 확인해야 해.':'시험·검수·승인 등 직접 완료 근거가 더 필요해.'
  };

  const completion={
    physicalPercent:physicalCompletion,
    physicalLabel:physicalCompletion===null?'확인 필요':`${physicalCompletion}%`,
    physicalBasis:physicalCompletion===null?'직접 실적률 데이터 미연결 — 계획진행률로 대체하지 않음':'직접 실적 근거',
    planConsumptionPercent:planConsumption,
    planConsumptionLabel:planConsumption===null?'계획 없음/확인 필요':`${planConsumption}%`,
    productionSlackDays:numOrNull(analysis?.productionSlackDays),
    productionStatus:text(analysis?.productionStatus)||null,
    bottleneck:text(analysis?.bottleneck)||null,
    evidenceDate:dateText(analysis?.snapshotDate),
    actualBasis:text(analysis?.actualBasis)||null
  };

  return {
    completion,
    criticalMaterials,
    qualityGate,
    shipmentGate,
    summary:{
      physicalCompletion:completion.physicalLabel,
      planConsumption:completion.planConsumptionLabel,
      assemblyReady,
      quality:qualityGate.status,
      shipment:shipmentGate.status,
      productionSlackDays:completion.productionSlackDays
    }
  };
}

module.exports={buildProductionReadiness,hasCompletedTestEvidence};
