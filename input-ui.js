// HandsFree Mobile REAL 0.4.3 — structured mobile field input.
// Uses the same append-only queue gate as Grow. No operational ledger is
// written directly from this UI.
(() => {
  const q=(s)=>document.querySelector(s);
  const qa=(s)=>[...document.querySelectorAll(s)];
  const text=(v)=>String(v??'').trim();
  let kind='WORK';
  let prepared=null;

  const KIND_META={
    WORK:{label:'업무',uiKey:'UI_INPUT_WORK',help:'오늘 진행한 작업이나 진행상태를 빠르게 남겨.'},
    CHANGE:{label:'일정변경',uiKey:'UI_INPUT_CHANGE',help:'기존 계획은 보존하고 변경 사유와 새 일정을 남겨.'},
    ISSUE:{label:'이슈',uiKey:'UI_INPUT_CHANGE',help:'지연·불량·입고문제 등 다음 공정에 영향을 주는 문제를 남겨.'},
    SUPPORT:{label:'지원',uiKey:'UI_SUPPORT',help:'A/S·PT·타부서 지원 이력을 남겨.'}
  };

  function todayKst(){
    try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
    catch(_){return new Date().toISOString().slice(0,10);}
  }
  function openSheet(){
    const sheet=q('#inputSheet'); if(!sheet)return;
    sheet.classList.add('show');
    if(!q('#fieldDate').value) q('#fieldDate').value=todayKst();
    if(window.HFQueueClient?.refreshGate) window.HFQueueClient.refreshGate();
    renderDrafts();
    setKind(kind);
  }
  function closeSheet(){q('#inputSheet')?.classList.remove('show');}

  function setKind(next){
    kind=KIND_META[next]?next:'WORK';
    prepared=null;
    qa('[data-entry-kind]').forEach(b=>b.classList.toggle('active',b.dataset.entryKind===kind));
    qa('[data-show-kinds]').forEach(el=>{
      const allowed=(el.dataset.showKinds||'').split(',');
      el.classList.toggle('hidden',!allowed.includes(kind));
    });
    const meta=KIND_META[kind];
    if(q('#fieldHelp'))q('#fieldHelp').textContent=meta.help;
    if(q('#fieldSubmit'))q('#fieldSubmit').textContent=`${meta.label} 안전검증`;
    q('#fieldConfirm')?.classList.add('hidden');
    if(q('#fieldResult'))q('#fieldResult').textContent='아직 운영 데이터에는 아무것도 기록하지 않았어.';
  }

  function required(value,label){
    if(!text(value)) throw new Error(`${label}을 입력해줘`);
    return text(value);
  }
  function formPayload(){
    const target=text(q('#fieldTarget')?.value);
    const detail=required(q('#fieldDetail')?.value,'내용');
    if(kind!=='SUPPORT'&&!target) throw new Error('대상 장비/발주번호를 입력해줘');
    const payload={
      schemaVersion:'MOBILE_ENTRY_V1',
      uiKey:KIND_META[kind].uiKey,
      entryType:kind,
      target:target||null,
      date:text(q('#fieldDate')?.value)||todayKst(),
      owner:text(q('#fieldOwner')?.value)||null,
      process:text(q('#fieldProcess')?.value)||null,
      detail,
      capturedAt:new Date().toISOString(),
      ui:'STRUCTURED_FORM'
    };
    if(kind==='CHANGE'){
      payload.newDate=required(q('#fieldNewDate')?.value,'변경 후 일정');
      payload.changeReason=text(q('#fieldReason')?.value)||detail;
    }
    if(kind==='ISSUE'){
      payload.issueType=text(q('#fieldIssueType')?.value)||'기타';
      payload.nextAction=text(q('#fieldNextAction')?.value)||null;
    }
    if(kind==='SUPPORT'){
      payload.supportType=text(q('#fieldSupportType')?.value)||'타부서지원';
      payload.participants=text(q('#fieldParticipants')?.value)||null;
    }
    return payload;
  }
  function requestFromForm(){
    return {
      requester:'Emotion',
      source:'MOBILE_FORM',
      kind,
      priority:text(q('#fieldPriority')?.value)||'NORMAL',
      payload:formPayload()
    };
  }
  function summary(req){
    const p=req.payload||{};
    const parts=[KIND_META[req.kind]?.label||req.kind,p.target,p.process,p.date].filter(Boolean);
    return `${parts.join(' · ')}\n${p.detail||''}`;
  }

  async function validateForm(e){
    e?.preventDefault?.();
    const result=q('#fieldResult');
    q('#fieldConfirm')?.classList.add('hidden');
    try{
      if(!window.HFQueueClient?.prepareStructured) throw new Error('입력 안전모듈을 불러오지 못했어');
      const req=requestFromForm();
      result.textContent='안전게이트에서 입력을 검증 중…';
      const check=await window.HFQueueClient.prepareStructured(req,{saveWhenLocked:true,label:summary(req)});
      prepared=check.request;
      if(!check.ready){
        result.textContent=`${summary(req)}\n\n현재는 ${check.reason} 상태라 실제 시트에는 쓰지 않았어. 이 기기에 미등록 초안으로만 보관했어.`;
        prepared=null;
        renderDrafts();
        return;
      }
      result.textContent=`${summary(req)}\n\n검증 완료. 아직 시트에는 쓰지 않았어. 내용이 맞으면 아래 확인 버튼을 눌러 입력대기열에 등록해.`;
      q('#fieldConfirm')?.classList.remove('hidden');
    }catch(err){
      result.textContent=err.message||String(err);
      prepared=null;
    }
  }

  async function confirmForm(){
    if(!prepared)return;
    const result=q('#fieldResult');
    const btn=q('#fieldConfirm');
    btn.disabled=true;
    result.textContent='안전게이트를 다시 확인하고 입력대기열에 등록 중…';
    try{
      const out=await window.HFQueueClient.commitStructured(prepared);
      if(!out.ok){
        result.textContent=`등록하지 않았어. ${out.reason}\n운영 데이터는 변경하지 않았고 초안만 보관했어.`;
        prepared=null;
        btn.classList.add('hidden');
        renderDrafts();
        return;
      }
      result.textContent=out.duplicate?`동일 요청이 이미 있어. 기존 요청 ${out.requestId||''}를 유지했어.`:`입력대기열 접수 완료 · ${out.requestId||''}`;
      prepared=null;
      btn.classList.add('hidden');
      if(!out.duplicate) resetForm(false);
      renderDrafts();
    }catch(err){
      result.textContent=`등록 오류: ${err.message||err}`;
    }finally{btn.disabled=false;}
  }

  function resetForm(clearResult=true){
    const keepDate=todayKst();
    ['#fieldTarget','#fieldOwner','#fieldProcess','#fieldDetail','#fieldNewDate','#fieldReason','#fieldNextAction','#fieldParticipants'].forEach(s=>{if(q(s))q(s).value='';});
    if(q('#fieldDate'))q('#fieldDate').value=keepDate;
    if(q('#fieldIssueType'))q('#fieldIssueType').value='품질';
    if(q('#fieldSupportType'))q('#fieldSupportType').value='타부서지원';
    if(q('#fieldPriority'))q('#fieldPriority').value='NORMAL';
    prepared=null;
    q('#fieldConfirm')?.classList.add('hidden');
    if(clearResult&&q('#fieldResult'))q('#fieldResult').textContent='입력 내용을 비웠어. 운영 데이터는 변경되지 않았어.';
  }

  function draftLine(d){
    const p=d?.request?.payload||d?.payload||{};
    const label=d.label||[KIND_META[d?.request?.kind||d.kind]?.label,p.target,p.detail].filter(Boolean).join(' · ');
    return `<div class="draft-row"><div><b>${escapeHtml(label||'미등록 입력')}</b><small>${escapeHtml((d.savedAt||'').replace('T',' ').slice(0,16))}</small></div></div>`;
  }
  function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function renderDrafts(){
    const list=q('#entryDraftList'); if(!list)return;
    const all=window.HFQueueClient?.drafts?.()||[];
    q('#entryDraftCount').textContent=`${all.length}건`;
    list.innerHTML=all.length?all.slice(0,5).map(draftLine).join(''):'<div class="empty compact">미등록 초안이 없어.</div>';
  }

  function boot(){
    q('#fieldInputFab')?.addEventListener('click',openSheet);
    q('#openFieldInput')?.addEventListener('click',openSheet);
    q('#inputSheet .close')?.addEventListener('click',closeSheet);
    q('#inputSheet')?.addEventListener('click',e=>{if(e.target===q('#inputSheet'))closeSheet();});
    qa('[data-entry-kind]').forEach(b=>b.addEventListener('click',()=>setKind(b.dataset.entryKind)));
    q('#fieldForm')?.addEventListener('submit',validateForm);
    q('#fieldConfirm')?.addEventListener('click',confirmForm);
    q('#fieldReset')?.addEventListener('click',()=>resetForm(true));
    if(q('#fieldDate'))q('#fieldDate').value=todayKst();
    setKind('WORK');
    renderDrafts();
    window.HFFieldInput={open:openSheet,setKind,renderDrafts};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
