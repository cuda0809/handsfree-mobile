// HandsFree Mobile REAL 0.4.2 — client-side Grow bridge.
// Read commands work without Google service-account credentials.
// Write commands are validated against /api/core/queue, but NEVER bypass the
// append-only gate. Even when the gate becomes READY, a second explicit user
// confirmation is required before queue append.
(() => {
  const DRAFT_KEY='hf-real-write-drafts-v1';
  let pendingWrite=null;

  const q=(s)=>document.querySelector(s);
  const text=(v)=>String(v??'').trim();

  function rows(){
    try{return typeof projectRows==='function'?projectRows():[];}catch(_){return [];}
  }
  function decisionRows(){
    try{return typeof decisions==='function'?decisions():[];}catch(_){return [];}
  }
  function lineProject(p){
    return `• ${p.customer||'-'} · ${p.device||p.job||'-'} — ${p.state||'상태 확인 필요'}${p.reason?` / ${p.reason}`:''}`;
  }
  function isReadIntent(input){
    const s=text(input);
    if(/(알려줘|보여줘|찾아줘|뭐야|무엇|왜|이유|현황|상태|어때|몇|확인해|확인해줘|조회)/.test(s)) return true;
    return /[?？]$/.test(s);
  }
  function explicitWrite(s){
    return /(반영해|기록해|등록해|추가해|변경해|바꿔|미뤄|연기해|당겨|삭제해|처리해|완료로|진행으로)/.test(s);
  }
  function operationalUpdate(s){
    return /(입고대기|입고 대기|불량발생|불량 발생|휴가|연차|출장|지원 예정|지원해|늦어진|늦어졌|늦어진대|미뤄졌|연기됐|당겨졌|진행중|진행 중|완료 예정|입고 예정|재입고완료|재입고 완료)/.test(s);
  }
  function isWriteIntent(input){
    const s=text(input);
    if(explicitWrite(s)) return true;
    if(isReadIntent(s)) return false;
    return operationalUpdate(s);
  }
  function kindFor(input){
    const s=text(input);
    if(/(일정|납기|연기|미뤄|당겨|변경|늦어진|늦어졌|미뤄졌|연기됐|당겨졌)/.test(s)) return 'CHANGE';
    if(/(불량|고장|문제|지연|입고대기|입고 대기|끼임|동심|소음|재검증)/.test(s)) return 'ISSUE';
    if(/(A\/S|\bAS\b|PT|타부서.?지원|지원)/i.test(s)) return 'SUPPORT';
    return 'WORK';
  }
  function priorityFor(input){
    return /(긴급|즉시|오늘까지|납기임박|납기 임박|안전)/.test(text(input))?'HIGH':'NORMAL';
  }
  function localAnswer(input){
    const s=text(input).toLowerCase();
    const ps=rows();
    if(!ps.length) return '현재 화면에 읽을 수 있는 프로젝트 데이터가 없어. 데이터 동기화 상태를 확인해줘.';

    if(/결정/.test(s)){
      const ds=decisionRows();
      if(!ds.length) return '현재 즉시 결정이 필요한 항목은 없어.';
      return `현재 판단 우선순위 ${ds.length}건\n`+ds.slice(0,5).map(lineProject).join('\n');
    }
    if(/막힌|보류|block|입고대기|입고 대기/.test(s)){
      const hit=ps.filter(p=>p.assemblyReady==='BLOCKED'||p.quality);
      if(!hit.length) return '현재 확인된 공정 보류/핵심 Blocker가 없어.';
      return `공정 보류·핵심 방해요인 ${hit.length}건\n`+hit.slice(0,6).map(lineProject).join('\n');
    }
    if(/납기|위험|긴급/.test(s)){
      const hit=ps.filter(p=>p.grade==='긴급'||p.grade==='주의');
      if(!hit.length) return '현재 데이터 기준 긴급·주의 납기 장비가 없어.';
      return `납기 위험 장비 ${hit.length}건\n`+hit.slice(0,6).map(lineProject).join('\n');
    }

    const normalized=s.replace(/[?？]/g,' ').replace(/(알려줘|보여줘|찾아줘|상태|현황|이유|왜|확인해줘|확인해)/g,' ').trim();
    const tokens=normalized.split(/\s+/).filter(t=>t.length>=2);
    const hit=ps.filter(p=>{
      const hay=Object.values(p).join(' ').toLowerCase();
      return tokens.length && tokens.every(t=>hay.includes(t));
    });
    if(hit.length) return `${hit.length}건 찾았어.\n`+hit.slice(0,6).map(lineProject).join('\n');

    const urgent=ps.filter(p=>p.grade==='긴급').length;
    const blocked=ps.filter(p=>p.assemblyReady==='BLOCKED').length;
    const quality=ps.filter(p=>p.quality).length;
    return `현재 프로젝트 ${ps.length}건 · 긴급 ${urgent}건 · 조립 준비 보류 ${blocked}건 · 품질 확인 ${quality}건이야. 발주번호·고객사·모델을 같이 말하면 더 정확히 찾아줄게.`;
  }

  async function fetchJson(url,opt){
    const r=await fetch(url,opt);
    let body={};
    try{body=await r.json();}catch(_){body={};}
    if(!r.ok && r.status!==423) throw new Error(body.message||body.error||`HTTP ${r.status}`);
    return {status:r.status,body};
  }
  function gateReason(body){
    const reasons=[...(body?.sheetGate?.reasons||[])];
    if(body?.parity && !body.parity.live) reasons.unshift('LIVE_READ_PENDING');
    const labels={
      GOOGLECREDENTIALSNOTCONFIGURED:'서비스계정 인증 대기',
      CREDENTIALS:'서비스계정 인증 대기',
      WRITESWITCH:'쓰기 스위치 잠금',
      LIVEREADPENDING:'OS v3 LIVE 읽기 대기',
      INTEGRITYPASS:'무결성 검사 확인 필요',
      CORECHECKPASS:'핵심점검 확인 필요',
      QUEUEHEADERS:'Queue 헤더 확인 필요',
      SPREADSHEETID:'V3 파일 ID 불일치',
      CURRENTVERSION:'V3 버전 기준 불일치',
      SHEETGATEREADFAILED:'시트 안전게이트 확인 실패'
    };
    const pretty=[...new Set(reasons.map(r=>{
      const key=String(r).replace(/_/g,'').toUpperCase();
      return labels[key]||String(r);
    }))];
    return pretty.join(' · ')||'안전 게이트 잠금';
  }
  function renderGate(body){
    const el=q('#queueGate'); if(!el) return;
    const ready=Boolean(body?.readyForAppend);
    el.className=`mode ${ready?'live':'demo'}`;
    el.textContent=ready?'쓰기 준비 완료 · 확인 후 입력대기열 등록 가능':`쓰기 잠금 · ${gateReason(body)}`;
  }
  async function refreshGate(){
    try{
      const {body}=await fetchJson('/api/core/queue',{cache:'no-store'});
      renderGate(body);
      return body;
    }catch(e){
      const el=q('#queueGate');
      if(el){el.className='mode demo';el.textContent='쓰기 게이트 상태 확인 불가 · 읽기 기능은 계속 사용 가능';}
      return null;
    }
  }

  function drafts(){
    try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'[]');}catch(_){return [];}
  }
  function saveDraft(item){
    const all=drafts();
    if(!all.some(x=>x.text===item.text && x.kind===item.kind)) all.unshift({...item,savedAt:new Date().toISOString()});
    localStorage.setItem(DRAFT_KEY,JSON.stringify(all.slice(0,20)));
    renderDraftInfo();
  }
  function renderDraftInfo(){
    const el=q('#draftInfo'); if(!el) return;
    const n=drafts().length;
    el.textContent=n?`이 기기에 미등록 초안 ${n}건 보관 중 · 자동 전송하지 않음`:'미등록 초안 없음';
  }
  function clearConfirm(){
    pendingWrite=null;
    q('#queueConfirmBtn')?.remove();
  }
  function addConfirmButton(){
    q('#queueConfirmBtn')?.remove();
    const result=q('#growResult'); if(!result) return;
    const b=document.createElement('button');
    b.id='queueConfirmBtn';
    b.className='queue-confirm';
    b.textContent='확인 후 입력대기열에 등록';
    b.onclick=confirmWrite;
    result.insertAdjacentElement('afterend',b);
  }
  async function confirmWrite(){
    if(!pendingWrite) return;
    const result=q('#growResult');
    const btn=q('#queueConfirmBtn'); if(btn) btn.disabled=true;
    result.textContent='안전 게이트를 다시 확인하고 등록 중…';
    try{
      const {status,body}=await fetchJson('/api/core/queue',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pendingWrite)
      });
      if(status===423||!body.ok){
        saveDraft({text:pendingWrite.payload.text,kind:pendingWrite.kind,priority:pendingWrite.priority});
        result.textContent=`등록하지 않았어. ${gateReason(body)}\n초안은 이 기기에만 보관했고 자동 재전송하지 않아.`;
        clearConfirm();
        await refreshGate();
        return;
      }
      result.textContent=body.duplicate?`이미 같은 요청이 있어. 기존 요청 ${body.requestId||''} 상태를 유지했어.`:`입력대기열 접수 완료 · ${body.requestId||''}`;
      clearConfirm();
      await refreshGate();
    }catch(e){
      result.textContent=`등록 오류: ${e.message}`;
      if(btn) btn.disabled=false;
    }
  }

  async function runGrowBridge(){
    const input=text(q('#growInput')?.value);
    if(!input){if(typeof toast==='function')toast('명령을 입력해줘');return;}
    clearConfirm();
    const result=q('#growResult');

    if(!isWriteIntent(input)){
      result.textContent=localAnswer(input);
      return;
    }

    const request={
      requester:'Emotion',
      source:'MOBILE_REAL',
      kind:kindFor(input),
      priority:priorityFor(input),
      payload:{text:input,capturedAt:new Date().toISOString(),ui:'GROW'},
      dryRun:true
    };
    result.textContent='쓰기 명령을 안전 게이트에서 검증 중…';
    try{
      const {body}=await fetchJson('/api/core/queue',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)
      });
      renderGate({...body,readyForAppend:body.state==='READY'});
      pendingWrite={...request,dryRun:false};
      if(body.state!=='READY'||!body.ok){
        saveDraft({text:input,kind:request.kind,priority:request.priority});
        result.textContent=`${request.kind} 입력으로 분류했어.\n현재는 ${gateReason(body)} 상태라 실제 시트에는 아무것도 쓰지 않았어.\n초안만 이 기기에 보관했고, 인증 후에도 자동 전송하지 않아.`;
        pendingWrite=null;
        return;
      }
      result.textContent=`${request.kind} 입력으로 검증 완료.\n아직 시트에는 쓰지 않았어. 내용이 맞으면 아래 확인 버튼을 눌러 입력대기열에 등록해.`;
      addConfirmButton();
    }catch(e){
      saveDraft({text:input,kind:request.kind,priority:request.priority});
      result.textContent=`쓰기 검증 연결 오류: ${e.message}\n운영 데이터는 변경하지 않았고 초안만 이 기기에 보관했어.`;
      pendingWrite=null;
    }
  }

  function boot(){
    const run=q('#growRun'); if(run) run.onclick=runGrowBridge;
    document.querySelectorAll('.grow-quick').forEach(b=>b.onclick=()=>{if(q('#growInput'))q('#growInput').value=b.dataset.q||'';runGrowBridge();});
    renderDraftInfo();
    refreshGate();
    window.HFQueueClient={refreshGate,runGrowBridge,drafts};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
