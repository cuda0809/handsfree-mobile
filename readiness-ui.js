// HandsFree Mobile REAL 0.4 — veteran production readiness UI.
// Enhances project detail without changing V3 operational data.
(function(){
  if(typeof pdRenderProject!=='function') return;
  const baseRender=pdRenderProject;
  const s=v=>esc(v===null||v===undefined||v===''?'-':v);
  const stateLabel=v=>({READY:'준비 완료',BLOCKED:'준비 미완료',UNKNOWN:'확인 필요',CLEAR:'이상 없음',REVERIFY_REQUIRED:'재검증 필요',HOLD:'보류',VERIFY:'확인 필요',CANDIDATE:'출고 가능 후보',EVIDENCE:'완료 근거 있음'}[v]||v||'확인 필요');
  const stateClass=v=>['READY','CLEAR','CANDIDATE','EVIDENCE'].includes(v)?'ok':['BLOCKED','HOLD','REVERIFY_REQUIRED'].includes(v)?'hold':'verify';
  function row(label,value,sub,state){return `<div class="pr-card ${stateClass(state)}"><small>${s(label)}</small><b>${s(value)}</b>${sub?`<p>${s(sub)}</p>`:''}</div>`;}
  function buildPanel(p){
    const r=p.readiness||{};
    const c=r.completion||{};
    const m=r.criticalMaterials||{};
    const q=r.qualityGate||{};
    const sh=r.shipmentGate||{};
    const physical=c.physicalLabel||'확인 필요';
    const plan=c.planConsumptionLabel||((p.progress!==null&&p.progress!==undefined)?`${p.progress}%`:'확인 필요');
    const material=stateLabel(m.status||p.assemblyReady);
    const materialSub=(m.blockingCount||0)>0?`막는 근거 ${m.blockingCount}건${m.blockingEvidence?.[0]?' · '+m.blockingEvidence[0]:''}`:(m.note||p.supplyStatus||'부품 단위 핵심자재 데이터 연결 필요');
    const quality=stateLabel(q.status||(p.qualityActive?'REVERIFY_REQUIRED':'CLEAR'));
    const qualitySub=(q.openCount||0)>0?`활성 품질 이슈 ${q.openCount}건${q.evidence?.[0]?' · '+q.evidence[0]:''}`:(q.note||'현재 활성 품질 이슈 없음');
    const shipment=sh.label||stateLabel(sh.status||'VERIFY');
    const slack=c.productionSlackDays!==null&&c.productionSlackDays!==undefined?`${c.productionSlackDays}일`:'확인 필요';
    const evidenceDate=c.evidenceDate?` · 근거 ${c.evidenceDate}`:'';
    const checks=(sh.checks||[]).map(g=>`<div class="pr-check"><span>${s(g.label)}</span><b class="${stateClass(g.status)}">${s(stateLabel(g.status))}</b><p>${s(g.evidence||'직접 근거 확인 필요')}</p></div>`).join('');
    return `<section class="pr-panel">
      <div class="pr-head"><div><small>생산판단 4대 기준</small><h3>지금 이 장비가 어디까지 준비됐는지</h3></div><span>${s(shipment)}</span></div>
      <div class="pr-grid">
        ${row('실제 완성도',physical,c.physicalBasis||'직접 실적률 데이터 확인 필요',c.physicalPercent===null||c.physicalPercent===undefined?'VERIFY':'CLEAR')}
        ${row('계획 소진율',plan,`생산 여유 ${slack}${evidenceDate}`,'VERIFY')}
        ${row('핵심자재 준비도',material,materialSub,m.status||p.assemblyReady)}
        ${row('품질 재검증',quality,qualitySub,q.status||(p.qualityActive?'REVERIFY_REQUIRED':'CLEAR'))}
      </div>
      <div class="pr-shipment"><small>출고 가능 조건</small><b>${s(shipment)}</b><p>${s(sh.reason||'시험·검수·승인 근거를 순서대로 확인해.')}</p></div>
      <div class="pr-evidence">
        <div><small>조립 가능일</small><b>${s(m.assemblyAvailableDate||p.assemblyAvailableDate||'확인 필요')}</b></div>
        <div><small>생산 여유</small><b>${s(slack)}</b></div>
        <div><small>현재 병목</small><b>${s(c.bottleneck||p.bottleneck||p.blocker||'명확한 병목 근거 없음')}</b></div>
      </div>
      ${checks?`<details class="pr-gates"><summary>출고 조건 상세 보기</summary>${checks}</details>`:''}
    </section>`;
  }
  pdRenderProject=function(p,source){
    const safe={...p,progress:null};
    let html=baseRender(safe,source);
    const panel=buildPanel(p);
    const marker='<div class="detail-grid">';
    if(html.includes(marker)) html=html.replace(marker,panel+marker);
    else html=panel+html;
    return html;
  };
  const style=document.createElement('style');
  style.textContent=`
    .pr-panel{margin:10px 0 13px;border:1px solid #d6e1ec;background:#fff;border-radius:16px;padding:11px}.pr-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:9px}.pr-head small{font-size:8px;font-weight:900;color:#54718d}.pr-head h3{font-size:13px;margin:2px 0 0}.pr-head>span{font-size:9px;font-weight:900;background:#f0f4f8;padding:6px 8px;border-radius:999px;white-space:nowrap}
    .pr-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pr-card{border:1px solid #dfe7ef;border-radius:12px;padding:9px;min-height:72px}.pr-card small{display:block;font-size:8px;color:#6e7f90}.pr-card b{display:block;font-size:12px;margin:3px 0;line-height:1.25}.pr-card p{font-size:8px;line-height:1.45;margin:0;color:#637487}.pr-card.ok{background:#f3fbf7}.pr-card.hold{background:#fff5ef;border-color:#f0d5c5}.pr-card.verify{background:#f8fafc}
    .pr-shipment{margin-top:8px;border-radius:12px;padding:10px;background:#102a4a;color:white}.pr-shipment small{font-size:8px;opacity:.72}.pr-shipment b{display:block;font-size:13px;margin:2px 0}.pr-shipment p{font-size:8px;line-height:1.5;margin:0;opacity:.8}
    .pr-evidence{display:grid;grid-template-columns:1fr 1fr 2fr;gap:6px;margin-top:8px}.pr-evidence>div{border:1px solid #e1e7ee;border-radius:10px;padding:7px}.pr-evidence small{display:block;font-size:7px;color:#7c8b99}.pr-evidence b{display:block;font-size:9px;line-height:1.35;margin-top:2px}
    .pr-gates{margin-top:8px;border-top:1px dashed #d9e1e8;padding-top:8px}.pr-gates summary{font-size:9px;font-weight:900;cursor:pointer}.pr-check{padding:8px 0;border-bottom:1px solid #edf1f5;display:grid;grid-template-columns:1fr auto;gap:3px 8px}.pr-check span,.pr-check b{font-size:9px}.pr-check p{grid-column:1/-1;margin:0;font-size:8px;color:#697989;line-height:1.45}.pr-check b.ok{color:#16704b}.pr-check b.hold{color:#b54c2e}.pr-check b.verify{color:#7b6b24}
    @media(max-width:420px){.pr-evidence{grid-template-columns:1fr 1fr}.pr-evidence>div:last-child{grid-column:1/-1}}
  `;
  document.head.appendChild(style);
})();
