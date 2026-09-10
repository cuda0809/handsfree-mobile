const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let APP = { mode:'loading', now:'', data:[], metrics:{}, query:'', projectFilter:'all' };
let deferredPrompt = null;

const FALLBACK = {
  ok:true,
  mode:'snapshot',
  now:'2026-09-10',
  metrics:{todayWork:3,urgent:3,issues:5,supportEvents:4},
  data:[
    {grade:'주의',job:'LAB-260109K-004',customer:'데모기',device:'APM-20K (연속순환믹서)',purchase:'자재수령 계획 없음',slack:'병행 · D-4',state:'조립',inspection:'검수 전 단계',shipment:'D-4 · 09/16',reason:'세니타리 입고대기 · 자재수령 OPEN 이슈',pm:'이기환'},
    {grade:'주의',job:'260626A-046',customer:'한국재료연구원',device:'KRM-100D2',purchase:'구매 진행 · 입고지연 재확인',slack:'병행 · D-6',state:'전장 / 테스트',inspection:'검수 전 단계',shipment:'D-6 · 09/18',reason:'전장업체 전장품 입고 지연 · 전장 일정 변경 이력',pm:'조나단'},
    {grade:'주의',job:'260710A-052',customer:'미코',device:'KDM-150',purchase:'구매 · 일정 적합',slack:'병행 · D-32',state:'마감 조립',inspection:'검수 전 단계',shipment:'D-32 · 10/30',reason:'82D 끼임 / 36D 동심 문제 · 수정 반출 및 외주 실조립 확인 필요',pm:'서정완'},
    {grade:'주의',job:'260708A-051',customer:'오랜드바이오',device:'PDM-300C',purchase:'입고 지연 재확인',slack:'입고대기 · D-6',state:'보완 후 재확인',inspection:'검수 전 단계',shipment:'D-6 · 09/18',reason:'자전컵·컵 공차 소음 · 오링단 가공 후 재검증 필요',pm:'서정완'},
    {grade:'협의',job:'260601A-039-01',customer:'트루메카(대덕전자)',device:'PDM-1KV-A',purchase:'구매 완료 · 생산DB 진척 93%',slack:'자재확보',state:'검수완료',inspection:'완성품 검수완료',shipment:'출고일 미확정',reason:'고객사 연기 / PM 협의',pm:'김재석'},
    {grade:'긴급',job:'260727A-060-01',customer:'재고(SIC) → LG화학',device:'KRM-50B',purchase:'구매 진행 14% · 예정 09/11',slack:'입고대기 · D-12',state:'생산전',inspection:'검수 전 단계',shipment:'D-12 · 09/30',reason:'핵심 자재 입고 후 생산 가능기간 확인 필요',pm:'조나단'},
    {grade:'긴급',job:'260714A-054',customer:'코스모스랩',device:'DCM-20K',purchase:'구매 진행 23% · 예정 09/20',slack:'입고대기 · D-20',state:'생산전',inspection:'검수 전 단계',shipment:'D-20 · 10/14',reason:'설계/구매 지연 누적 · 생산여유 축소',pm:'김형섭'},
    {grade:'긴급',job:'260724A-059',customer:'나노실리칸첨단소재',device:'KMCLF-120',purchase:'구매 미확정',slack:'입고대기 · D-26',state:'생산전',inspection:'검수 전 단계',shipment:'D-26 · 10/22',reason:'구매 미확정 · 실제 조립 가능일 미확정',pm:'서정완'}
  ]
};

function toast(text){ const n=$('#toast'); n.textContent=text; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),2200); }
function openSheet(id){ $('#'+id)?.classList.add('show'); }
function closeSheet(id){ $('#'+id)?.classList.remove('show'); }
function activePage(id){
  $$('.page').forEach(p=>p.classList.toggle('active', p.id===`page-${id}`));
  $$('.bottom button[data-page]').forEach(b=>b.classList.toggle('active', b.dataset.page===id));
  window.scrollTo({top:0,behavior:'smooth'});
}

async function getJSON(url,opt){ const r=await fetch(url,opt); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }

function normalizeRow(x){
  const text=[x.purchase,x.reason,x.state,x.slack].filter(Boolean).join(' ');
  const blocked=/입고대기|미확정|계획 없음|지연|경과|재확인/.test(text) && !/구매 완료|자재확보/.test(text);
  const quality=/불량|끼임|동심|공차|소음|수정|보완|재검증/.test(text);
  let nextGate='조립 준비';
  if(/검수완료/.test(x.state||'')) nextGate='출고 승인';
  else if(/검수/.test(x.state||'')) nextGate='검수 완료';
  else if(/테스트|구동/.test(x.state||'')) nextGate='검수/FAT';
  else if(/프로그램/.test(x.state||'')) nextGate='구동 테스트';
  else if(/전장/.test(x.state||'')) nextGate='프로그램/테스트';
  else if(/조립|보완/.test(x.state||'')) nextGate='전장';
  return {...x, assemblyReady:blocked?'BLOCKED':'READY', quality, nextGate, blocker:blocked?(x.reason||x.purchase):''};
}

function riskRank(g){ return g==='긴급'?0:g==='주의'?1:g==='협의'?2:3; }
function projectRows(){ return APP.data.map(normalizeRow).sort((a,b)=>riskRank(a.grade)-riskRank(b.grade)); }
function isActiveWork(x){ return x.state && !/오늘 계획 없음|생산전/.test(x.state); }
function hasIssue(x){ return x.reason || x.grade==='긴급' || x.grade==='주의'; }

function decisionFor(x){
  if(x.assemblyReady==='BLOCKED') return `${x.purchase || '자재 상태'} — 조립 가능일과 대체 작업 순서를 결정할 필요가 있어.`;
  if(x.quality) return `${x.reason || '품질 이슈'} — 수정품 재검증 후 다음 Gate 진행 여부 판단이 필요해.`;
  if(/고객사 연기|출고일 미확정/.test([x.reason,x.shipment].join(' '))) return `고객 출고 일정이 확정되지 않았어. PM 협의 결과와 운영 기준일을 확정해야 해.`;
  if(x.grade==='긴급') return `남은 공정 대비 여유가 작아. 선행공정과 생산 순서 재배치를 검토해야 해.`;
  return x.reason || `${x.nextGate} 진행 여부 확인`;
}

function decisions(){
  return projectRows().filter(x=>x.grade==='긴급'||x.quality||x.assemblyReady==='BLOCKED'||/미확정|고객사 연기/.test([x.reason,x.shipment].join(' '))).slice(0,5);
}

function deriveMetrics(){
  const rows=projectRows();
  return {
    todayWork: APP.metrics.todayWork ?? rows.filter(isActiveWork).length,
    urgent: APP.metrics.urgent ?? rows.filter(x=>x.grade==='긴급').length,
    issues: APP.metrics.issues ?? rows.filter(hasIssue).length,
    blocked: rows.filter(x=>x.assemblyReady==='BLOCKED').length
  };
}

function projectCard(x){
  return `<article class="project-card">
    <div class="card-top"><div><div class="job">${esc(x.job)}</div><div class="title">${esc(x.customer)}</div><div class="sub">${esc(x.device||'모델 미표시')}</div></div><span class="badge ${esc(x.grade||'안정')}">${esc(x.grade||'안정')}</span></div>
    <div class="grid2">
      <div class="mini"><small>현재상태</small><b>${esc(x.state||'-')}</b></div>
      <div class="mini"><small>다음 Gate</small><b>${esc(x.nextGate)}</b></div>
      <div class="mini"><small>Assembly Ready</small><b>${x.assemblyReady==='READY'?'READY':'BLOCKED'}</b></div>
      <div class="mini"><small>출고/납기</small><b>${esc(x.shipment||'-')}</b></div>
    </div>
    ${x.reason?`<div class="blocker">${esc(x.reason)}</div>`:''}
    <div class="row-actions"><button class="project-open primary" data-job="${esc(x.job)}">프로젝트 생애 보기</button></div>
  </article>`;
}

function renderToday(){
  const ds=decisions(), m=deriveMetrics(), rows=projectRows();
  $('#decisionCount').textContent=`${ds.length}건`;
  $('#decisionList').innerHTML=ds.length?ds.map(x=>`<div class="decision-item"><strong>${esc(x.customer)} · ${esc(x.device||x.job)}</strong><p>${esc(decisionFor(x))}</p><button class="decision-open" data-job="${esc(x.job)}">근거 보기</button></div>`).join(''):`<div class="decision-item"><strong>현재 즉시 결정 항목 없음</strong><p>새로운 지연·품질·자재·납기 위험이 생기면 여기에 먼저 올라와.</p></div>`;
  $('#sWork').textContent=m.todayWork; $('#sUrgent').textContent=m.urgent; $('#sIssue').textContent=m.issues; $('#sBlocked').textContent=m.blocked;
  const blockers=rows.filter(x=>x.assemblyReady==='BLOCKED'||x.quality).slice(0,4);
  $('#blockerList').innerHTML=blockers.length?blockers.map(projectCard).join(''):`<div class="empty">현재 확인된 핵심 Blocker가 없어.</div>`;
  const work=rows.filter(isActiveWork).slice(0,5);
  $('#workList').innerHTML=work.length?work.map(x=>`<article class="work-card"><div class="card-top"><div><div class="job">${esc(x.job)}</div><div class="title">${esc(x.customer)} · ${esc(x.device||'')}</div></div><span class="badge ${esc(x.grade||'안정')}">${esc(x.grade||'안정')}</span></div><div class="grid2"><div class="mini"><small>현재 작업</small><b>${esc(x.state)}</b></div><div class="mini"><small>다음 Gate</small><b>${esc(x.nextGate)}</b></div></div><div class="row-actions"><button class="project-open" data-job="${esc(x.job)}">상세</button></div></article>`).join(''):`<div class="empty">현재 데이터에서 오늘 실행 공정을 찾지 못했어.</div>`;
}

function renderProjects(){
  const q=($('#projectSearch').value||'').trim().toLowerCase();
  let rows=projectRows();
  if(APP.projectFilter==='urgent') rows=rows.filter(x=>x.grade==='긴급');
  if(APP.projectFilter==='blocked') rows=rows.filter(x=>x.assemblyReady==='BLOCKED');
  if(APP.projectFilter==='quality') rows=rows.filter(x=>x.quality);
  if(q) rows=rows.filter(x=>Object.values(x).join(' ').toLowerCase().includes(q));
  $('#projectList').innerHTML=rows.length?rows.map(projectCard).join(''):`<div class="empty">조건에 맞는 프로젝트가 없어.</div>`;
}

function renderIssues(){
  const rows=projectRows().filter(hasIssue);
  $('#issueList').innerHTML=rows.length?rows.map(x=>`<article class="issue-card"><div class="card-top"><div><div class="job">${esc(x.job)}</div><div class="title">${esc(x.customer)} · ${esc(x.device||'')}</div></div><span class="badge ${esc(x.grade||'주의')}">${esc(x.grade||'주의')}</span></div><div class="issue-meta"><span>${x.quality?'QUALITY':'OPERATION'}</span><span>${x.assemblyReady==='BLOCKED'?'BLOCKED':'MONITOR'}</span><span>Next: ${esc(x.nextGate)}</span></div><p>${esc(x.reason||x.purchase||x.slack||'추가 확인 필요')}</p><div class="row-actions"><button class="project-open" data-job="${esc(x.job)}">프로젝트 연결</button></div></article>`).join(''):`<div class="empty">활성 이슈가 없어.</div>`;
}

function renderSearch(){
  const q=($('#globalSearch').value||'').trim().toLowerCase();
  if(!q){ $('#searchResults').innerHTML='<div class="empty">발주번호, 고객사, 모델, 공정, 이슈 내용을 검색해.</div>'; return; }
  const rows=projectRows().filter(x=>Object.values(x).join(' ').toLowerCase().includes(q));
  $('#searchResults').innerHTML=rows.length?rows.map(projectCard).join(''):`<div class="empty">검색 결과가 없어. REAL Core가 연결되면 과거 Event/Issue/Part/A-S까지 함께 검색하게 돼.</div>`;
}

function wireDynamic(){
  $$('.project-open,.decision-open').forEach(b=>b.onclick=()=>showProject(b.dataset.job));
}

function renderAll(){ renderToday(); renderProjects(); renderIssues(); renderSearch(); wireDynamic(); }

function showProject(job){
  const x=projectRows().find(r=>r.job===job); if(!x) return;
  $('#detailJob').textContent=x.job||''; $('#detailTitle').textContent=`${x.customer}${x.device?' · '+x.device:''}`;
  const qualityText=x.quality?'품질/수정 이슈 연결':'현재 품질 Blocker 미감지';
  $('#detailBody').innerHTML=`
    <div class="detail-grid">
      <div class="detail-box"><small>위험도</small><b>${esc(x.grade||'안정')}</b></div>
      <div class="detail-box"><small>현재상태</small><b>${esc(x.state||'-')}</b></div>
      <div class="detail-box"><small>Assembly Ready</small><b>${x.assemblyReady}</b></div>
      <div class="detail-box"><small>다음 Gate</small><b>${esc(x.nextGate)}</b></div>
      <div class="detail-box"><small>구매/외주</small><b>${esc(x.purchase||'-')}</b></div>
      <div class="detail-box"><small>납기/출고</small><b>${esc(x.shipment||'-')}</b></div>
      <div class="detail-box"><small>검수</small><b>${esc(x.inspection||'-')}</b></div>
      <div class="detail-box"><small>PM</small><b>${esc(x.pm||'-')}</b></div>
    </div>
    ${x.reason?`<div class="blocker"><b>현재 근거</b><br>${esc(x.reason)}</div>`:''}
    <div class="section-title"><h2>Project Lifecycle</h2><span>REAL 0.1 연결 뷰</span></div>
    <div class="timeline">
      <div class="timeline-item"><b>PLAN · 기준 계획</b><p>초기계획은 덮어쓰지 않고 기준선으로 유지.</p></div>
      <div class="timeline-item"><b>SUPPLY · ${x.assemblyReady}</b><p>${esc(x.purchase||'구매/외주입고 정보 연결 대기')}</p></div>
      <div class="timeline-item"><b>PRODUCTION · ${esc(x.state||'상태 미확정')}</b><p>다음 Gate: ${esc(x.nextGate)}</p></div>
      <div class="timeline-item"><b>QUALITY · ${esc(qualityText)}</b><p>${esc(x.reason||'활성 품질 이벤트 없음')}</p></div>
      <div class="timeline-item"><b>SHIPMENT · ${esc(x.shipment||'미확정')}</b><p>출고완료 이후에는 설치/SAT/A-S 생애이력으로 이어질 예정.</p></div>
    </div>`;
  openSheet('detailSheet');
}

async function refresh(){
  $('#syncBadge').textContent='동기화 중'; $('#syncBadge').className='sync';
  try{
    const r=await getJSON('/api/dashboard',{cache:'no-store'});
    if(!r || r.ok===false) throw new Error(r?.error||'dashboard unavailable');
    APP={...APP,...r,mode:'live',data:r.data||[]};
  }catch(e){ APP={...APP,...FALLBACK,mode:'demo',data:FALLBACK.data}; }
  $('#syncBadge').textContent=APP.mode==='live'?'LIVE':'REFERENCE';
  $('#syncBadge').className=`sync ${APP.mode==='live'?'live':'demo'}`;
  $('#syncText').textContent=APP.mode==='live'?`실데이터 연결 · ${APP.now||'동기화 완료'}`:'REAL UI 기준선 · 기존 API 연결 대기';
  $('#growMode').textContent=APP.mode==='live'?'LIVE · HandsFree 데이터 쓰기 경로 연결':'REFERENCE · 읽기전용 기준선';
  $('#growMode').className=`mode ${APP.mode==='live'?'live':'demo'}`;
  renderAll();
}

async function runGrow(){
  const text=($('#growInput').value||'').trim(); if(!text) return toast('명령을 입력해줘');
  if(APP.mode!=='live'){ $('#growResult').textContent='REAL UI는 시작됐지만 현재 이 브랜치의 새 Core 쓰기 엔진은 아직 연결 전이야. 기존 이력은 건드리지 않고, 다음 단계에서 Project/Event API를 연결한다.'; return; }
  $('#growResult').textContent='처리 중…';
  try{
    const r=await getJSON('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
    if(r.needsConfirmation){ $('#growResult').textContent=`결정 필요: ${r.summary||text}`; return; }
    $('#growResult').textContent=r.answer||r.message||'처리 완료'; await refresh();
  }catch(e){ $('#growResult').textContent=`처리 오류: ${e.message}`; }
}

function startVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR) return toast('이 브라우저는 음성 인식을 지원하지 않아');
  const r=new SR(); r.lang='ko-KR'; r.interimResults=false;
  r.onresult=e=>$('#growInput').value=e.results[0][0].transcript;
  r.onerror=()=>toast('음성 인식 오류'); r.start();
}

function boot(){
  $$('.bottom button[data-page]').forEach(b=>b.onclick=()=>activePage(b.dataset.page));
  $('#growNav').onclick=()=>openSheet('growSheet');
  $('#syncBadge').onclick=refresh;
  $$('.close').forEach(b=>b.onclick=()=>closeSheet(b.dataset.close));
  $$('.sheet').forEach(s=>s.addEventListener('click',e=>{if(e.target===s)closeSheet(s.id)}));
  $('#projectSearch').addEventListener('input',()=>{renderProjects();wireDynamic()});
  $$('.chips button[data-filter]').forEach(b=>b.onclick=()=>{APP.projectFilter=b.dataset.filter;$$('.chips button[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderProjects();wireDynamic()});
  $('#globalSearch').addEventListener('input',()=>{renderSearch();wireDynamic()});
  $('#growRun').onclick=runGrow; $('#growVoice').onclick=startVoice;
  $$('.grow-quick').forEach(b=>b.onclick=()=>{$('#growInput').value=b.dataset.q;runGrow()});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});
  $('#installBtn').onclick=async()=>{if(!deferredPrompt)return toast('브라우저 메뉴에서 홈 화면에 추가할 수 있어');deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').classList.add('hidden')};
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  refresh();
}

document.addEventListener('DOMContentLoaded',boot);
