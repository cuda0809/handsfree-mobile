// HandsFree Mobile REAL 0.7 — LIVE FOCUS UI
// Uses automatic decision fields from REAL Core directly. No UI-side risk inference.
(() => {
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const pct=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(100,Number(v))):null;
  const riskRank=v=>({긴급:0,주의:1,협의:2,안정:3,정상:3}[v]??9);
  const isLive=s=>Boolean(s?.runtimeLiveRead)||['apps-script-live','google-live'].includes(String(s?.mode||''));
  const decisionSeverityClass=v=>String(v||'').toUpperCase()==='CRITICAL'?'critical':String(v||'').toUpperCase()==='HIGH'?'high':'normal';

  function installStyle(){
    if(q('#real-v07-focus-style'))return;
    const s=document.createElement('style');
    s.id='real-v07-focus-style';
    s.textContent=`
      .appbar{padding:calc(10px + env(safe-area-inset-top)) 12px 10px}.brand{gap:9px}.brand b{font-size:15px}.brand small{font-size:10px}.sync{min-height:40px;padding:8px 11px;font-size:11px;font-weight:900}
      .page{padding:15px 12px 24px}.page h1{font-size:27px;line-height:1.2;margin:3px 0 5px}.eyebrow{font-size:11px}.lead{font-size:13px;line-height:1.45;margin-bottom:12px}
      .stats{grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:12px}.stat{padding:13px 14px;border-radius:15px}.stat small{font-size:11px}.stat b{font-size:25px;margin-top:2px}
      .decision{padding:14px;border-radius:18px}.decision-head b{font-size:15px}.decision-count{font-size:11px}.decision-list{gap:8px}.decision-item{padding:12px 13px;min-height:56px}.decision-item strong{font-size:14px;line-height:1.35}.decision-item p{font-size:12px;line-height:1.45;margin-top:5px}.decision-item button{min-height:44px;font-size:12px;padding:9px 12px}
      .focus-decision-top{display:flex;align-items:center;gap:7px;justify-content:space-between}.focus-decision-meta{display:flex;gap:5px;align-items:center}.focus-pill{display:inline-flex;align-items:center;min-height:26px;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;background:#ffffff17;border:1px solid #ffffff22}.focus-pill.critical{background:#7d2630}.focus-pill.high{background:#7b571d}
      .section-title{margin:16px 1px 8px}.section-title h2{font-size:17px}.section-title span{font-size:11px}.stack{gap:8px}
      .focus-card{background:#fff;border:1px solid #dce5ef;border-radius:16px;padding:12px 13px;box-shadow:0 7px 22px rgba(17,42,74,.06)}.focus-card:active{background:#f3f7fb}.focus-card-top{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}.focus-id{font-size:10px;color:#718196;font-weight:900}.focus-title{font-size:16px;font-weight:900;margin-top:2px;line-height:1.25}.focus-sub{font-size:12px;color:#6f7f91;margin-top:2px}.focus-badges{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.focus-due,.focus-risk,.focus-block{white-space:nowrap;border-radius:999px;padding:5px 7px;font-size:10px;font-weight:900}.focus-due{background:#eef3f8;color:#52667c}.focus-risk.긴급{background:#ffe6e6;color:#ad2f2f}.focus-risk.주의{background:#fff0d5;color:#8f5b0b}.focus-risk.협의{background:#eeeaff;color:#5f51b7}.focus-risk.안정,.focus-risk.정상{background:#e4f5ec;color:#176e4c}.focus-block{background:#fff1e2;color:#965f12}
      .focus-flow{display:grid;grid-template-columns:1fr auto 1fr;gap:7px;align-items:center;background:#f7f9fc;border-radius:11px;padding:9px 10px;margin-top:9px}.focus-flow small{display:block;font-size:9px;color:#77889a}.focus-flow b{display:block;font-size:12px;line-height:1.35}.focus-arrow{color:#8aa0b7;font-weight:900}
      .focus-meta{display:flex;gap:7px;align-items:center;justify-content:space-between;margin-top:8px}.focus-progress{flex:1;display:grid;gap:4px}.focus-progress-row{display:grid;grid-template-columns:38px 1fr 30px;gap:6px;align-items:center;font-size:9px;color:#6e7f91}.focus-bar{height:6px;border-radius:99px;background:#e7edf4;overflow:hidden}.focus-bar span{display:block;height:100%;border-radius:99px;background:#476f9d}.focus-progress-row.actual .focus-bar span{background:#1c8a63}.focus-progress-row b{text-align:right;font-size:9px}.focus-detail{min-width:52px;min-height:44px;border:1px solid #ccd9e6;background:#fff;color:#315f8e;border-radius:11px;font-size:11px;font-weight:900}
      .focus-reason{font-size:11px;line-height:1.45;color:#6b4e26;background:#fff8eb;border-radius:9px;padding:7px 8px;margin-top:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .focus-issue{background:#fff;border:1px solid #dde6ef;border-radius:15px;padding:12px}.focus-issue h3{font-size:14px;margin:0}.focus-issue p{font-size:12px;line-height:1.45;margin:6px 0;color:#51647a}.focus-issue .issue-meta span{font-size:10px;padding:5px 7px}
      .bottom button,.chips button,.row-actions button,.read-tools button,.actions button,.entry-tabs button,.field-actions button,.pd-input-actions button{min-height:44px;touch-action:manipulation}.bottom{padding-top:6px}.bottom button{min-height:55px}.bottom span{font-size:10px}.bottom b{font-size:20px}.chips button{font-size:11px;padding:8px 11px}.searchbox input{min-height:46px;font-size:14px}.read-tools button{font-size:12px!important;padding:10px!important}
      .quick-entry.write-locked,.field-fab.write-locked{display:none!important}#coreSourceBox{display:none!important}
      .sheetbox{font-size:14px}.sheethead h2{font-size:21px}.sheethead small{font-size:11px}.close{min-width:44px;min-height:44px}.mode{font-size:11px;padding:9px 10px}.result{font-size:12px;line-height:1.5}.form-grid label span{font-size:10px}.form-grid input,.form-grid select,.form-grid textarea{font-size:14px;min-height:44px}
      @media(max-width:380px){.page h1{font-size:24px}.focus-title{font-size:15px}.focus-flow b{font-size:11px}.stats{gap:7px}.stat{padding:11px 12px}.stat b{font-size:23px}}
    `;
    document.head.appendChild(s);
  }

  function rows(){
    return (APP.data||[]).map(normalizeRow).sort((a,b)=>riskRank(a.grade)-riskRank(b.grade)||Number(Boolean(b.decisionRequired))-Number(Boolean(a.decisionRequired))||String(a.job||'').localeCompare(String(b.job||'')));
  }
  projectRows=rows;
  isActiveWork=x=>Boolean(x.todayWork||x.plannedToday);
  hasIssue=x=>Boolean(x.blocked||x.flowBlocked||x.quality||x.grade==='긴급'||x.grade==='주의');

  function progressHtml(x){
    const plan=pct(x.progressPlan??x.planConsumption??x.progress);
    const actual=pct(x.progressActual??x.physicalCompletion);
    const line=(label,value,cls='')=>`<div class="focus-progress-row ${cls}"><span>${label}</span><div class="focus-bar"><span style="width:${value===null?0:value}%"></span></div><b>${value===null?'—':value+'%'}</b></div>`;
    return `<div class="focus-progress">${line('계획',plan)}${line('실제',actual,'actual')}</div>`;
  }

  projectCard=function(x){
    const blocked=Boolean(x.blocked||x.flowBlocked||x.assemblyReady==='BLOCKED');
    const current=x.currentProcess||x.state||'상태 확인';
    const next=x.nextGate||'다음 공정 확인';
    const reason=(x.riskReasons||[]).join(' · ')||x.riskReason||x.reason||'';
    return `<article class="focus-card">
      <div class="focus-card-top"><div><div class="focus-id">${esc(x.job||'')}</div><div class="focus-title">${esc(x.customer||'-')}</div><div class="focus-sub">${esc(x.device||'모델 미표시')}</div></div><div class="focus-badges"><span class="focus-risk ${esc(x.grade||'안정')}">${esc(x.grade||'안정')}</span><span class="focus-due">${esc(x.dDay||x.shipment||'납기 확인')}</span>${blocked?'<span class="focus-block">멈춤</span>':''}</div></div>
      <div class="focus-flow"><div><small>현재</small><b>${esc(current)}</b></div><span class="focus-arrow">→</span><div><small>다음</small><b>${esc(next)}</b></div></div>
      ${reason?`<div class="focus-reason">${esc(reason)}</div>`:''}
      <div class="focus-meta">${progressHtml(x)}<button class="project-open focus-detail" data-job="${esc(x.job||'')}">상세</button></div>
    </article>`;
  };

  deriveMetrics=function(){
    const m=APP.metrics||{}, rs=rows();
    return {todayWork:m.todayWork??rs.filter(isActiveWork).length,urgent:m.urgent??rs.filter(x=>x.grade==='긴급').length,issues:m.decisionRequired??rs.filter(x=>x.decisionRequired).length,blocked:m.blocked??rs.filter(x=>x.blocked||x.flowBlocked).length};
  };

  renderCoreDecisionInbox=function(){
    const all=APP.coreDecisions||[], ds=all.slice(0,3), byId=new Map(rows().map(x=>[String(x.job||''),x]));
    q('#decisionCount').textContent=all.length>3?`${all.length}건 · 상위 3`:`${all.length}건`;
    q('#decisionList').innerHTML=ds.length?ds.map((d,i)=>{const p=byId.get(String(d.projectId||''));return `<div class="decision-item"><div class="focus-decision-top"><strong>${i+1}. ${esc(d.title||d.projectId||'판단 항목')}</strong><div class="focus-decision-meta"><span class="focus-pill ${decisionSeverityClass(d.severity)}">${esc(p?.dDay||'판단')}</span></div></div><p>${esc(d.decision||d.nextAction||'근거 확인 필요')}</p>${d.projectId?`<button class="decision-open" data-job="${esc(d.projectId)}">근거 보기</button>`:''}</div>`;}).join(''):`<div class="decision-item"><strong>현재 즉시 판단 항목 없음</strong><p>새 지연·품질·자재·납기 위험이 생기면 여기에 먼저 올라와.</p></div>`;
    wireDynamic();
  };

  renderToday=function(){
    const m=deriveMetrics(), rs=rows();
    const h=q('#page-today h1');if(h)h.textContent='오늘 먼저 볼 것';
    const labels=[['#sWork','오늘 작업'],['#sUrgent','긴급'],['#sIssue','판단 필요'],['#sBlocked','멈춤']];
    labels.forEach(([id,label])=>{const el=q(id);if(el?.parentElement?.querySelector('small'))el.parentElement.querySelector('small').textContent=label;});
    q('#sWork').textContent=m.todayWork;q('#sUrgent').textContent=m.urgent;q('#sIssue').textContent=m.issues;q('#sBlocked').textContent=m.blocked;
    const blockerTitle=q('#blockerList')?.previousElementSibling;q('#blockerList');
    if(blockerTitle){blockerTitle.querySelector('h2').textContent='멈춤·주의';blockerTitle.querySelector('span').textContent='상위 3건';}
    const blockers=rs.filter(x=>x.blocked||x.flowBlocked||x.quality).slice(0,3);
    q('#blockerList').innerHTML=blockers.length?blockers.map(projectCard).join(''):'<div class="empty">현재 즉시 멈춘 장비가 없어.</div>';
    const workTitle=q('#workList')?.previousElementSibling;if(workTitle){workTitle.querySelector('h2').textContent='오늘 진행';workTitle.querySelector('span').textContent='상위 3건';}
    const work=rs.filter(isActiveWork).slice(0,3);
    q('#workList').innerHTML=work.length?work.map(projectCard).join(''):'<div class="empty">오늘 작업으로 연결된 장비가 없어.</div>';
    wireDynamic();
  };

  renderProjects=function(){
    const term=(q('#projectSearch')?.value||'').trim().toLowerCase();let rs=rows();
    if(APP.projectFilter==='urgent')rs=rs.filter(x=>x.grade==='긴급');
    if(APP.projectFilter==='blocked')rs=rs.filter(x=>x.blocked||x.flowBlocked||x.assemblyReady==='BLOCKED');
    if(APP.projectFilter==='quality')rs=rs.filter(x=>x.quality);
    if(term)rs=rs.filter(x=>[x.job,x.customer,x.device,x.currentProcess,x.state,x.nextGate,x.riskReason,(x.riskReasons||[]).join(' ')].join(' ').toLowerCase().includes(term));
    q('#projectList').innerHTML=rs.length?rs.map(projectCard).join(''):'<div class="empty">조건에 맞는 프로젝트가 없어.</div>';wireDynamic();
  };

  renderIssues=function(){
    const rs=rows().filter(x=>x.blocked||x.flowBlocked||x.quality||x.grade==='긴급').sort((a,b)=>riskRank(a.grade)-riskRank(b.grade));
    q('#issueList').innerHTML=rs.length?rs.map(x=>`<article class="focus-issue"><div class="focus-card-top"><div><div class="focus-id">${esc(x.job||'')}</div><h3>${esc(x.customer||'-')} · ${esc(x.device||'')}</h3></div><div class="focus-badges"><span class="focus-risk ${esc(x.grade||'주의')}">${esc(x.grade||'주의')}</span>${(x.blocked||x.flowBlocked)?'<span class="focus-block">멈춤</span>':''}</div></div><div class="issue-meta"><span>${esc(x.blockType|| (x.quality?'QUALITY':'RISK'))}</span><span>${esc(x.dDay||'납기 확인')}</span><span>다음 ${esc(x.nextGate||'확인')}</span></div><p>${esc((x.riskReasons||[]).join(' · ')||x.riskReason||x.reason||'근거 확인 필요')}</p><button class="project-open focus-detail" data-job="${esc(x.job||'')}">상세</button></article>`).join(''):'<div class="empty">현재 활성 위험/멈춤 이슈가 없어.</div>';wireDynamic();
  };

  renderAll=function(){renderToday();renderProjects();renderIssues();renderSearch();wireDynamic();};
  coreSourceLabel=function(){const s=APP.coreSourceHealth||{};return isLive(s)?'OS V3 LIVE':s.mode==='private-runtime'?'OS V3':'REFERENCE';};
  renderCoreSource=function(){q('#coreSourceBox')?.remove();const b=q('.brand small');if(b)b.textContent='리얼 0.7 · LIVE FOCUS';};

  refresh=async function(){
    const sync=q('#syncBadge');if(sync){sync.textContent='동기화 중';sync.className='sync';}
    try{
      const r=await getJSON('/api/core/today?refresh=1',{cache:'no-store'});if(!r?.ok)throw new Error('REAL Core unavailable');
      APP={...APP,mode:'core',now:r.asOf||'',metrics:r.metrics||{},data:r.projects||[],coreDecisions:r.decisions||[],coreCapacity:r.capacity||[],coreSourceHealth:r.source||{}};
      const live=isLive(r.source), privateMode=r.source?.mode==='private-runtime';
      if(sync){sync.textContent=live?'● LIVE':privateMode?'OS V3':'REFERENCE';sync.className=`sync ${(live||privateMode)?'live':'demo'}`;}
      const st=q('#syncText');if(st)st.textContent=live?`OS v3 LIVE · 기준 ${APP.now} · 쓰기 잠금`:privateMode?`OS v3 비공개 원본 · 기준 ${APP.now}`:`검증용 기준선 · 기준 ${APP.now}`;
      const gm=q('#growMode');if(gm){gm.textContent=live?'LIVE READ · WRITE LOCK':privateMode?'PRIVATE READ · WRITE LOCK':'REFERENCE READ · WRITE LOCK';gm.className=`mode ${(live||privateMode)?'live':'demo'}`;}
      const locked=!r.source?.writeEnabled;q('.quick-entry')?.classList.toggle('write-locked',locked);q('#fieldInputFab')?.classList.toggle('write-locked',locked);
    }catch(e){
      APP={...APP,...FALLBACK,mode:'demo',data:FALLBACK.data,coreDecisions:[],coreCapacity:[],coreSourceHealth:{mode:'reference-snapshot',asOf:FALLBACK.now}};
      if(sync){sync.textContent='REFERENCE';sync.className='sync demo';}if(q('#syncText'))q('#syncText').textContent='REAL Core 연결 확인 필요';
    }
    renderAll();renderCoreDecisionInbox();renderCoreSource();
  };

  function keepBrand(){const b=q('.brand small');if(b&&b.textContent!=='리얼 0.7 · LIVE FOCUS')b.textContent='리얼 0.7 · LIVE FOCUS';}
  function boot(){installStyle();keepBrand();const body=document.body;if(body)new MutationObserver(keepBrand).observe(body,{subtree:true,childList:true,characterData:true});setTimeout(()=>{renderAll();renderCoreDecisionInbox();renderCoreSource();},0);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
