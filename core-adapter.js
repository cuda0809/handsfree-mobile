// HandsFree Mobile REAL 0.1 — structured Core adapter.
// Keeps Core decisions/data contracts separate from the UI shell.

const legacyNormalizeRow = normalizeRow;
normalizeRow = function(x){
  if(!x?.core) return legacyNormalizeRow(x);
  return {
    ...x,
    assemblyReady:x.assemblyReady || 'UNKNOWN',
    quality:Boolean(x.quality),
    nextGate:x.nextGate || '다음 Gate 확인',
    blocker:x.assemblyReady==='BLOCKED' ? (x.reason||x.purchase||'Blocking condition') : ''
  };
};

refresh = async function(){
  $('#syncBadge').textContent='Core 확인 중';
  $('#syncBadge').className='sync';
  try{
    const r=await getJSON('/api/core/today',{cache:'no-store'});
    if(!r?.ok) throw new Error('REAL Core unavailable');
    APP={
      ...APP,
      mode:'core',
      now:r.asOf||'',
      metrics:r.metrics||{},
      data:r.projects||[],
      coreDecisions:r.decisions||[],
      coreSource:r.source||''
    };
    $('#syncBadge').textContent='CORE';
    $('#syncBadge').className='sync live';
    $('#syncText').textContent=`REAL Core 0.1 · 정규화 읽기계층 · 기준 ${APP.now}`;
    $('#growMode').textContent='CORE READ · 조회/판단 가능 · 쓰기 게이트 잠금';
    $('#growMode').className='mode live';
  }catch(e){
    APP={...APP,...FALLBACK,mode:'demo',data:FALLBACK.data};
    $('#syncBadge').textContent='REFERENCE';
    $('#syncBadge').className='sync demo';
    $('#syncText').textContent='REAL UI 기준선 · Core 연결 확인 필요';
    $('#growMode').textContent='REFERENCE · 읽기전용 기준선';
    $('#growMode').className='mode demo';
  }
  renderAll();
};

renderSearch = async function(){
  const q=($('#globalSearch').value||'').trim();
  if(!q){
    $('#searchResults').innerHTML='<div class="empty">발주번호, 고객사, 모델, 공정, 이슈 내용을 검색해.</div>';
    return;
  }
  if(APP.mode!=='core'){
    const rows=projectRows().filter(x=>Object.values(x).join(' ').toLowerCase().includes(q.toLowerCase()));
    $('#searchResults').innerHTML=rows.length?rows.map(projectCard).join(''):'<div class="empty">검색 결과가 없어.</div>';
    wireDynamic();
    return;
  }
  try{
    const r=await getJSON('/api/core/search?q='+encodeURIComponent(q),{cache:'no-store'});
    const projectHtml=(r.projects||[]).map(p=>projectCard(normalizeRow({
      grade:p.risk,job:p.id,customer:p.customer,device:p.model,purchase:p.supplyStatus,
      state:p.state,inspection:p.inspection,shipment:p.shipmentPlan||p.customerDueDate||'출고일 미확정',
      reason:p.blocker,pm:p.pm,assemblyReady:p.assemblyReady,quality:p.qualityActive,nextGate:p.nextGate,core:true
    }))).join('');
    const issueHtml=(r.issues||[]).map(i=>`<article class="issue-card"><div class="job">ISSUE · ${esc(i.id)}</div><div class="title">${esc(i.projectId)} · ${esc(i.type)}</div><div class="issue-meta"><span>${esc(i.severity)}</span><span>${esc(i.status)}</span><span>${esc(i.process)}</span></div><p>${esc(i.cause)} · 다음: ${esc(i.nextAction)}</p></article>`).join('');
    const eventHtml=(r.events||[]).map(e=>`<article class="issue-card"><div class="job">EVENT · ${esc(e.date)}</div><div class="title">${esc(e.projectId)} · ${esc(e.process||e.type)}</div><p>${esc(e.summary)}${e.cause?' · '+esc(e.cause):''}</p></article>`).join('');
    $('#searchResults').innerHTML=(projectHtml+issueHtml+eventHtml)||'<div class="empty">PROJECT / EVENT / ISSUE에서 검색 결과가 없어.</div>';
    wireDynamic();
  }catch(e){
    $('#searchResults').innerHTML='<div class="empty">Core 검색 연결을 확인하지 못했어.</div>';
  }
};

runGrow = async function(){
  const text=($('#growInput').value||'').trim();
  if(!text) return toast('명령을 입력해줘');
  if(APP.mode!=='core'){
    $('#growResult').textContent='현재 REAL Core 조회계층을 사용할 수 없어. 기준선 화면만 유지 중이야.';
    return;
  }
  if(/반영|변경|미뤄|당겨|수정|취소|등록|저장/.test(text)){
    $('#growResult').textContent='REAL 0.1은 현재 읽기/판단 Core만 열려 있어. 원본을 바꾸는 명령은 쓰기 게이트가 연결될 때까지 차단했어.';
    return;
  }
  if(/결정|판단/.test(text)){
    try{
      const r=await getJSON('/api/core/today',{cache:'no-store'});
      const ds=r.decisions||[];
      $('#growResult').textContent=ds.length?ds.map((d,i)=>`${i+1}. ${d.title}\n${d.decision}`).join('\n\n'):'현재 사람 판단이 필요한 항목이 없어.';
    }catch(e){ $('#growResult').textContent='Decision Inbox를 읽지 못했어.'; }
    return;
  }
  if(/blocked|막힌|입고대기/i.test(text)){
    const rows=projectRows().filter(x=>x.assemblyReady==='BLOCKED');
    $('#growResult').textContent=rows.length?rows.map(x=>`${x.customer} · ${x.device}\n막힘: ${x.reason||x.purchase}\n다음 Gate: ${x.nextGate}`).join('\n\n'):'현재 BLOCKED 프로젝트가 없어.';
    return;
  }
  try{
    const cleaned=text.replace(/상태|알려줘|보여줘|현재|지금|어떻게|왜/g,' ').trim();
    const r=await getJSON('/api/core/search?q='+encodeURIComponent(cleaned||text),{cache:'no-store'});
    const out=[];
    (r.projects||[]).slice(0,3).forEach(p=>out.push(`${p.customer} · ${p.model} (${p.id})\n현재 ${p.state} / Assembly ${p.assemblyReady} / 다음 ${p.nextGate}${p.blocker?'\n근거: '+p.blocker:''}`));
    (r.issues||[]).slice(0,3).forEach(i=>out.push(`이슈 ${i.type} · ${i.projectId}\n${i.cause}\n다음: ${i.nextAction}`));
    (r.events||[]).slice(0,3).forEach(e=>out.push(`이력 ${e.date} · ${e.projectId}\n${e.summary}`));
    $('#growResult').textContent=out.length?out.join('\n\n'):'REAL Core에서 관련 프로젝트·이벤트·이슈를 찾지 못했어.';
  }catch(e){
    $('#growResult').textContent='REAL Core 검색 중 오류가 발생했어.';
  }
};
