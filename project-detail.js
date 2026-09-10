// HandsFree Mobile REAL 0.3 — evidence-first project detail.
// Loaded after core-adapter.js. Keeps the legacy detail as an offline fallback.
const legacyShowProjectDetail = showProject;

(function installProjectDetailStyles(){
  const style=document.createElement('style');
  style.textContent=`
    .pd-hero{border:1px solid #d8e4ef;background:linear-gradient(145deg,#f8fbff,#eef5ff);border-radius:16px;padding:12px;margin-bottom:10px}
    .pd-hero-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.pd-kicker{font-size:8px;font-weight:900;color:#52769b;letter-spacing:.06em}.pd-state{font-size:15px;font-weight:900;margin-top:2px;line-height:1.35}.pd-ready{font-size:9px;font-weight:900;border-radius:999px;padding:6px 9px;white-space:nowrap}.pd-ready.READY{background:#e5f6ed;color:#166f4c}.pd-ready.BLOCKED{background:#ffe8e8;color:#b73737}.pd-ready.UNKNOWN{background:#eef2f6;color:#607080}
    .pd-progress{height:7px;background:#dce6f0;border-radius:99px;margin-top:10px;overflow:hidden}.pd-progress>span{display:block;height:100%;background:linear-gradient(90deg,#2f76f6,#7566e8);border-radius:99px}.pd-progress-label{display:flex;justify-content:space-between;margin-top:4px;font-size:8px;color:#6f7f91}
    .pd-decision{border:1px solid #f0dec0;background:#fff7e9;border-radius:13px;padding:10px;margin:10px 0}.pd-decision small{display:block;font-size:8px;color:#94600d;font-weight:900}.pd-decision b{display:block;font-size:11px;margin:3px 0;line-height:1.4}.pd-decision p{font-size:9px;line-height:1.5;margin:0;color:#745b36}
    .pd-section{margin-top:14px}.pd-section-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.pd-section-head h3{font-size:13px;margin:0}.pd-count{font-size:8px;color:#6f7f91;background:#eef3f7;border-radius:999px;padding:4px 7px}
    .pd-list{display:grid;gap:7px}.pd-item{border:1px solid #dce5ef;background:#fff;border-radius:12px;padding:9px}.pd-item-top{display:flex;justify-content:space-between;gap:8px}.pd-item b{font-size:10px;line-height:1.4}.pd-item time,.pd-item .pd-tag{font-size:8px;color:#6f7f91}.pd-item p{font-size:9px;color:#506277;line-height:1.5;margin:5px 0 0}.pd-next{margin-top:6px;padding-top:6px;border-top:1px dashed #dce5ef;font-size:8px;color:#315f8e}.pd-change{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:start}.pd-delta{min-width:38px;text-align:center;border-radius:9px;background:#f1f4f8;padding:7px 5px;font-size:9px;font-weight:900}.pd-delta.plus{background:#ffe8e8;color:#b73737}.pd-delta.minus{background:#e5f6ed;color:#166f4c}.pd-empty{border:1px dashed #cddae7;border-radius:12px;padding:13px;text-align:center;color:#7b8a9c;font-size:9px;background:#fafcff}.pd-source{margin-top:14px;text-align:center;color:#8a98a8;font-size:8px}.pd-loading{padding:28px 12px;text-align:center;color:#6f7f91;font-size:10px}
  `;
  document.head.appendChild(style);
})();

function pdDate(v){
  if(!v) return '-';
  const s=String(v); return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(5,10).replace('-','/') : s;
}
function pdText(v,fallback='-'){ return v===null||v===undefined||v===''?fallback:String(v); }
function pdSortDesc(list){ return [...(list||[])].sort((a,b)=>String(b.date||b.latestUpdate||b.openedAt||'').localeCompare(String(a.date||a.latestUpdate||a.openedAt||''))); }
function pdIssueCause(i){ return i.cause||i.note||i.resolution||[i.process,i.type].filter(Boolean).join(' · ')||'상세 근거 확인 필요'; }
function pdChangeReason(c){ return c.reason||c.summary||c.raw||'변경 사유 미기록'; }
function pdEventSummary(e){ return e.summary||e.raw||[e.type,e.process].filter(Boolean).join(' · ')||'업무이력'; }
function pdDelta(c){ const n=Number(c.deltaDays??c.cumulativeDays??0); return Number.isFinite(n)?n:0; }
function pdEmpty(text){ return `<div class="pd-empty">${esc(text)}</div>`; }
function pdStatusBadge(p){ const ready=['READY','BLOCKED','UNKNOWN'].includes(p.assemblyReady)?p.assemblyReady:'UNKNOWN'; return `<span class="pd-ready ${ready}">${ready}</span>`; }

function pdRenderProject(p,source){
  const issues=(p.issues||[]).filter(i=>String(i.status||'OPEN').toUpperCase()!=='CLOSED');
  const changes=pdSortDesc(p.changes).slice(0,8);
  const events=pdSortDesc(p.events).slice(0,10);
  const capa=pdSortDesc(p.capacityImpacts).slice(0,5);
  const progress=Number.isFinite(Number(p.progress))?Math.max(0,Math.min(100,Number(p.progress))):null;
  const blocker=p.blocker||p.riskReason||issues.map(pdIssueCause).filter(Boolean)[0]||'현재 명확한 Blocker 근거 없음';
  const next=p.nextGate||'다음 Gate 확인';
  const due=p.shipmentPlan||p.customerDueDate||'-';
  const team=Array.isArray(p.production)?p.production.join(', '):(p.production||'-');
  const sourceLabel=source?.runtimeDirectGoogleRead?'OS v3 LIVE':source?.label||source?.mode||'REAL Core';
  return `
    <div class="pd-hero">
      <div class="pd-hero-top"><div><div class="pd-kicker">CURRENT OPERATION</div><div class="pd-state">${esc(p.state||p.stage||'현재상태 확인')}</div></div>${pdStatusBadge(p)}</div>
      ${progress!==null?`<div class="pd-progress"><span style="width:${progress}%"></span></div><div class="pd-progress-label"><span>진행률</span><b>${progress}%</b></div>`:''}
    </div>
    <div class="detail-grid">
      <div class="detail-box"><small>위험도</small><b>${esc(p.risk||'안정')}</b></div>
      <div class="detail-box"><small>다음 Gate</small><b>${esc(next)}</b></div>
      <div class="detail-box"><small>납기/출고</small><b>${esc(due)}</b></div>
      <div class="detail-box"><small>검수</small><b>${esc(p.inspection||'검수 전 단계')}</b></div>
      <div class="detail-box"><small>구매/입고</small><b>${esc(p.supplyStatus||'-')}</b></div>
      <div class="detail-box"><small>PM</small><b>${esc(p.pm||'-')}</b></div>
      <div class="detail-box"><small>생산담당</small><b>${esc(team)}</b></div>
      <div class="detail-box"><small>열린 이슈</small><b>${issues.length}건</b></div>
    </div>
    <div class="pd-decision"><small>지금 판단 근거</small><b>${esc(blocker)}</b><p>다음 기준점: ${esc(next)}${p.dueDays!==null&&p.dueDays!==undefined?` · 납기 D${Number(p.dueDays)>=0?'-':'+'}${Math.abs(Number(p.dueDays))}`:''}</p></div>

    <section class="pd-section"><div class="pd-section-head"><h3>열린 이슈</h3><span class="pd-count">${issues.length}건</span></div><div class="pd-list">
      ${issues.length?issues.map(i=>`<div class="pd-item"><div class="pd-item-top"><b>${esc([i.type,i.process].filter(Boolean).join(' · ')||'ISSUE')}</b><span class="pd-tag">${esc(i.status||'OPEN')}</span></div><p>${esc(pdIssueCause(i))}</p>${i.nextAction?`<div class="pd-next">다음 조치 · ${esc(i.nextAction)}</div>`:''}</div>`).join(''):pdEmpty('현재 연결된 열린 이슈가 없어.')}
    </div></section>

    <section class="pd-section"><div class="pd-section-head"><h3>일정 변경</h3><span class="pd-count">${changes.length}건</span></div><div class="pd-list">
      ${changes.length?changes.map(c=>{const d=pdDelta(c);return `<div class="pd-item pd-change"><div class="pd-delta ${d>0?'plus':d<0?'minus':''}">${d>0?'+':''}${d}일</div><div><div class="pd-item-top"><b>${esc(c.process||c.changeType||'일정변경')}</b><time>${esc(pdDate(c.date))}</time></div><p>${esc([c.previousDate&&pdDate(c.previousDate),c.effectiveDate&&'→ '+pdDate(c.effectiveDate)].filter(Boolean).join(' ')||pdChangeReason(c))}</p>${(c.reason||c.summary)?`<div class="pd-next">사유 · ${esc(pdChangeReason(c))}</div>`:''}</div></div>`}).join(''):pdEmpty('현재 연결된 일정 변경 이력이 없어.')}
    </div></section>

    <section class="pd-section"><div class="pd-section-head"><h3>최근 업무이력</h3><span class="pd-count">최근 ${events.length}건</span></div><div class="pd-list">
      ${events.length?events.map(e=>`<div class="pd-item"><div class="pd-item-top"><b>${esc([e.process,e.type].filter(Boolean).join(' · ')||'업무')}</b><time>${esc(pdDate(e.date))}</time></div><p>${esc(pdEventSummary(e))}</p>${e.participants?`<div class="pd-next">담당/참여 · ${esc(e.participants)}</div>`:''}</div>`).join(''):pdEmpty('현재 연결된 업무이력이 없어.')}
    </div></section>

    <section class="pd-section"><div class="pd-section-head"><h3>인력 / CAPA 영향</h3><span class="pd-count">${capa.length}건</span></div><div class="pd-list">
      ${capa.length?capa.map(c=>`<div class="pd-item"><div class="pd-item-top"><b>${esc(c.risk||c.process||'CAPA')}</b><time>${esc(pdDate(c.date))}</time></div><p>${esc(c.summary||`가용 ${pdText(c.availableFTE)} / 계획 ${pdText(c.demandFTE)} FTE`)}</p>${c.impactDays?`<div class="pd-next">예상 영향 · ${esc(c.impactDays)}일</div>`:''}</div>`).join(''):pdEmpty('이 프로젝트에 연결된 CAPA 영향이 없어.')}
    </div></section>
    <div class="pd-source">READ ONLY · ${esc(sourceLabel)} · 기준 ${esc(source?.asOf||APP.now||'-')}</div>`;
}

showProject = async function(job){
  const local=projectRows().find(r=>r.job===job);
  if(!local) return;
  $('#detailJob').textContent=local.job||'';
  $('#detailTitle').textContent=`${local.customer}${local.device?' · '+local.device:''}`;
  $('#detailBody').innerHTML='<div class="pd-loading">프로젝트 근거를 Core에서 확인 중…</div>';
  openSheet('detailSheet');
  if(APP.mode!=='core') return legacyShowProjectDetail(job);
  try{
    const r=await getJSON('/api/core/projects?id='+encodeURIComponent(job),{cache:'no-store'});
    const p=r?.projects?.[0];
    if(!p) throw new Error('project evidence not found');
    $('#detailJob').textContent=p.id||job;
    $('#detailTitle').textContent=`${p.customer||local.customer}${p.model?' · '+p.model:''}`;
    $('#detailBody').innerHTML=pdRenderProject(p,r.source||APP.coreSourceHealth||{});
  }catch(e){
    legacyShowProjectDetail(job);
    toast('Core 상세 근거를 못 불러와 요약 화면으로 표시했어');
  }
};

if(typeof renderCoreSource==='function'){
  const baseRenderCoreSource03=renderCoreSource;
  renderCoreSource=function(){
    baseRenderCoreSource03();
    const brand=$('.brand small'); if(brand) brand.textContent='REAL 0.3 · Evidence-first Project Core';
  };
}
