// HandsFree Mobile REAL 0.2 — source-aware Core adapter.
const legacyNormalizeRow = normalizeRow;
normalizeRow = function(x){
  if(!x?.core) return legacyNormalizeRow(x);
  const ready=['READY','BLOCKED','UNKNOWN'].includes(x.assemblyReady)?x.assemblyReady:'UNKNOWN';
  return {...x,assemblyReady:ready,quality:Boolean(x.quality),nextGate:x.nextGate||'다음 Gate 확인',
    blocker:ready==='BLOCKED'?(x.reason||x.purchase||'Blocking condition'):'',source:x.source||'REAL_CORE'};
};

function coreSourceLabel(){
  return APP.coreSourceHealth?.mode==='private-runtime'?'OS V3':'REFERENCE';
}
function renderCoreDecisionInbox(){
  const ds=APP.coreDecisions||[];
  $('#decisionCount').textContent=`${ds.length}건`;
  $('#decisionList').innerHTML=ds.length?ds.map(d=>`<div class="decision-item"><strong>${esc(d.title||d.projectId||'판단 항목')}</strong><p>${esc(d.decision||d.nextAction||'근거 확인 필요')}</p>${d.projectId?`<button class="decision-open" data-job="${esc(d.projectId)}">근거 보기</button>`:''}</div>`).join(''):`<div class="decision-item"><strong>현재 즉시 결정 항목 없음</strong><p>새 지연·품질·자재·CAPA 위험이 생기면 여기에 먼저 올라와.</p></div>`;
  wireDynamic();
}
function renderCoreSource(){
  let box=$('#coreSourceBox');
  if(!box){
    box=document.createElement('section'); box.id='coreSourceBox'; box.className='decision';
    $('.stats')?.insertAdjacentElement('afterend',box);
  }
  const s=APP.coreSourceHealth||{}, caps=APP.coreCapacity||[];
  const privateMode=s.mode==='private-runtime';
  box.innerHTML=`<div class="decision-head"><b>Core Source</b><span class="decision-count">${privateMode?'PRIVATE':'REFERENCE'}</span></div>
    <div class="decision-item"><strong>${privateMode?'OS v3 비공개 운영 소스':'검증용 Reference 소스'}</strong><p>기준 ${esc(s.asOf||APP.now||'-')} · 쓰기 ${s.writeEnabled?'ON':'LOCK'}${privateMode?'':' · 실시간 Google 연결 전'}</p></div>
    ${caps.slice(0,2).map(c=>`<div class="decision-item"><strong>${esc(c.date||'')} · 생산B팀 CAPA</strong><p>${esc(c.summary||`가용 ${c.availableFTE??'-'} / 계획 ${c.demandFTE??'-'} FTE`)}</p></div>`).join('')}`;
  const brand=$('.brand small'); if(brand) brand.textContent='REAL 0.2 · Source-aware Operations Core';
}

refresh = async function(){
  $('#syncBadge').textContent='Core 확인 중'; $('#syncBadge').className='sync';
  try{
    const r=await getJSON('/api/core/today',{cache:'no-store'});
    if(!r?.ok) throw new Error('REAL Core unavailable');
    APP={...APP,mode:'core',now:r.asOf||'',metrics:r.metrics||{},data:r.projects||[],
      coreDecisions:r.decisions||[],coreCapacity:r.capacity||[],coreSourceHealth:r.source||{}};
    const privateMode=r.source?.mode==='private-runtime';
    $('#syncBadge').textContent=coreSourceLabel(); $('#syncBadge').className=`sync ${privateMode?'live':'demo'}`;
    $('#syncText').textContent=privateMode?`OS v3 비공개 운영소스 · 기준 ${APP.now}`:`REAL 0.2 검증 기준선 · 기준 ${APP.now} · 실시간 원장 연결 전`;
    $('#growMode').textContent=privateMode?'CORE READ · PRIVATE SOURCE · 쓰기 게이트 잠금':'REFERENCE READ · 쓰기 게이트 잠금';
    $('#growMode').className=`mode ${privateMode?'live':'demo'}`;
  }catch(e){
    APP={...APP,...FALLBACK,mode:'demo',data:FALLBACK.data,coreDecisions:[],coreCapacity:[],coreSourceHealth:{mode:'reference-snapshot',asOf:FALLBACK.now}};
    $('#syncBadge').textContent='REFERENCE'; $('#syncBadge').className='sync demo';
    $('#syncText').textContent='REAL UI 기준선 · Core 연결 확인 필요';
    $('#growMode').textContent='REFERENCE · 읽기전용 기준선'; $('#growMode').className='mode demo';
  }
  renderAll(); renderCoreDecisionInbox(); renderCoreSource();
};

renderSearch = async function(){
  const q=($('#globalSearch').value||'').trim();
  if(!q){$('#searchResults').innerHTML='<div class="empty">발주번호, 고객사, 모델, 공정, 이슈, 변경이력을 검색해.</div>';return;}
  if(APP.mode!=='core'){
    const rows=projectRows().filter(x=>Object.values(x).join(' ').toLowerCase().includes(q.toLowerCase()));
    $('#searchResults').innerHTML=rows.length?rows.map(projectCard).join(''):'<div class="empty">검색 결과가 없어.</div>'; wireDynamic(); return;
  }
  try{
    const r=await getJSON('/api/core/search?q='+encodeURIComponent(q),{cache:'no-store'});
    const projectHtml=(r.projects||[]).map(p=>projectCard(normalizeRow({grade:p.risk,job:p.id,customer:p.customer,device:p.model,purchase:p.supplyStatus,state:p.state,inspection:p.inspection,shipment:p.shipmentPlan||p.customerDueDate||'출고일 미확정',reason:p.blocker||p.riskReason,pm:p.pm,assemblyReady:p.assemblyReady,quality:p.qualityActive,nextGate:p.nextGate,core:true,source:p.source}))).join('');
    const issueHtml=(r.issues||[]).map(i=>`<article class="issue-card"><div class="job">ISSUE · ${esc(i.id||'')}</div><div class="title">${esc(i.projectId||'')} · ${esc(i.type||'')}</div><p>${esc(i.cause||i.note||'')}</p></article>`).join('');
    const changeHtml=(r.changes||[]).map(c=>`<article class="issue-card"><div class="job">CHANGE · ${esc(c.date||'')}</div><div class="title">${esc(c.projectId||'')} · ${esc(c.process||'')}</div><p>${esc(c.summary||c.reason||'')}</p></article>`).join('');
    const eventHtml=(r.events||[]).map(e=>`<article class="issue-card"><div class="job">EVENT · ${esc(e.date||'')}</div><div class="title">${esc(e.projectId||'')} · ${esc(e.process||e.type||'')}</div><p>${esc(e.summary||e.raw||'')}</p></article>`).join('');
    $('#searchResults').innerHTML=(projectHtml+issueHtml+changeHtml+eventHtml)||'<div class="empty">PROJECT / EVENT / ISSUE / CHANGE에서 검색 결과가 없어.</div>'; wireDynamic();
  }catch(e){$('#searchResults').innerHTML='<div class="empty">Core 검색 연결을 확인하지 못했어.</div>';}
};

runGrow = async function(){
  const text=($('#growInput').value||'').trim(); if(!text) return toast('명령을 입력해줘');
  if(/반영|변경|미뤄|당겨|수정|취소|등록|저장/.test(text)){
    $('#growResult').textContent='REAL 0.2는 원본 직접쓰기를 금지해. OS v3 입력대기열 → 검증 → 반영 Write Gate가 연결될 때까지 변경 명령은 잠금 상태야.'; return;
  }
  if(APP.mode!=='core'){ $('#growResult').textContent='현재 REAL Core 운영 소스를 읽지 못했어. Reference 화면만 유지 중이야.'; return; }
  if(/결정|판단|우선/.test(text)){
    const ds=APP.coreDecisions||[]; $('#growResult').textContent=ds.length?ds.map((d,i)=>`${i+1}. ${d.title}\n${d.decision}`).join('\n\n'):'현재 사람 판단이 필요한 항목이 없어.'; return;
  }
  if(/blocked|막힌|입고대기/i.test(text)){
    const rows=projectRows().filter(x=>x.assemblyReady==='BLOCKED');
    $('#growResult').textContent=rows.length?rows.map(x=>`${x.customer} · ${x.device}\n막힘: ${x.reason||x.purchase}\n다음 Gate: ${x.nextGate}`).join('\n\n'):'현재 근거상 BLOCKED 프로젝트가 없어.'; return;
  }
  try{
    const cleaned=text.replace(/상태|알려줘|보여줘|현재|지금|어떻게|왜/g,' ').trim();
    const r=await getJSON('/api/core/search?q='+encodeURIComponent(cleaned||text),{cache:'no-store'}),out=[];
    (r.projects||[]).slice(0,3).forEach(p=>out.push(`${p.customer} · ${p.model} (${p.id})\n현재 ${p.state} / Assembly ${p.assemblyReady} / 다음 ${p.nextGate}${p.blocker?'\n근거: '+p.blocker:''}`));
    (r.issues||[]).slice(0,3).forEach(i=>out.push(`이슈 ${i.type} · ${i.projectId}\n${i.cause||i.note||''}\n다음: ${i.nextAction||'확인 필요'}`));
    (r.changes||[]).slice(0,3).forEach(c=>out.push(`변경 ${c.date} · ${c.projectId}\n${c.summary||c.reason||''}`));
    (r.events||[]).slice(0,3).forEach(e=>out.push(`이력 ${e.date} · ${e.projectId||''}\n${e.summary||e.raw||''}`));
    $('#growResult').textContent=out.length?out.join('\n\n'):'REAL Core에서 관련 근거를 찾지 못했어.';
  }catch(e){$('#growResult').textContent='REAL Core 검색 중 오류가 발생했어.';}
};
