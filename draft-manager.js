// HandsFree Mobile REAL 0.4.4 — local draft manager.
// Drafts stay on this device only. Loading/editing/deleting a draft never
// writes to Google Sheets and never bypasses the queue safety gate.
(() => {
  const DRAFT_KEY='hf-real-write-drafts-v1';
  const q=(s)=>document.querySelector(s);
  const text=(v)=>String(v??'').trim();

  function drafts(){
    try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'[]');}catch(_){return [];}
  }
  function saveAll(items){
    localStorage.setItem(DRAFT_KEY,JSON.stringify(items.slice(0,20)));
    window.HFFieldInput?.renderDrafts?.();
    refresh();
  }
  function reqOf(d={}){
    if(d.request)return d.request;
    if(d.text)return {requester:'Emotion',source:'MOBILE_REAL',kind:d.kind||'WORK',priority:d.priority||'NORMAL',payload:{text:d.text,ui:'GROW'}};
    if(d.payload)return {requester:'Emotion',source:'MOBILE_FORM',kind:d.kind||d.payload.entryType||'WORK',priority:d.priority||'NORMAL',payload:d.payload};
    return null;
  }
  function isGrow(req){
    const p=req?.payload||{};
    return p.ui==='GROW'||Boolean(p.text&&!p.schemaVersion);
  }
  function escapeHtml(v=''){
    return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function labelOf(d,req){
    const p=req?.payload||{};
    if(d.label)return String(d.label).replace(/\n+/g,' · ');
    if(isGrow(req))return p.text||'그로우 입력';
    return [req?.kind,p.target,p.process,p.detail].filter(Boolean).join(' · ')||'미등록 입력';
  }
  function whenOf(d){
    return text(d.savedAt).replace('T',' ').slice(0,16)||'저장시각 없음';
  }
  function kindLabel(k){return ({WORK:'업무',CHANGE:'일정변경',ISSUE:'이슈',SUPPORT:'지원'})[String(k||'').toUpperCase()]||'입력';}

  function installStyle(){
    if(q('#draft-manager-style'))return;
    const s=document.createElement('style');
    s.id='draft-manager-style';
    s.textContent=`
      .draft-manager{margin-top:12px;border-top:1px solid #e2e9f1;padding-top:12px}.draft-manager-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px}.draft-manager-head b{font-size:10px}.draft-manager-head button{border:0;background:#f3f5f8;color:#6b7888;border-radius:9px;padding:6px 8px;font-size:8px}.draft-manager-note{font-size:8px;color:#7a8999;line-height:1.4;margin-bottom:7px}.draft-manage-list{display:grid;gap:7px}.draft-manage-row{border:1px solid #dfe7f0;background:#fafcff;border-radius:11px;padding:9px}.draft-manage-top{display:flex;justify-content:space-between;gap:8px}.draft-manage-top b{font-size:9px}.draft-manage-top span{font-size:8px;color:#738396}.draft-manage-row p{margin:5px 0 7px;font-size:9px;color:#42566c;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.draft-manage-actions{display:grid;grid-template-columns:2fr 1fr;gap:6px}.draft-manage-actions button{border:1px solid #cbd9e7;background:#fff;color:#315f8e;border-radius:9px;padding:7px;font-size:8px;font-weight:900}.draft-manage-actions .delete{color:#a34a4a;background:#fff7f7;border-color:#efd2d2}`;
    document.head.appendChild(s);
  }
  function ensurePanel(){
    const anchor=q('#entryDraftList');
    if(!anchor||q('#draftManager'))return;
    const sec=document.createElement('section');
    sec.id='draftManager';
    sec.className='draft-manager';
    sec.innerHTML=`<div class="draft-manager-head"><b>초안 관리</b><button id="clearDrafts" type="button">전체 삭제</button></div><div class="draft-manager-note">초안은 이 휴대폰에만 저장돼. 불러오기만 해서는 전송되지 않고, 다시 안전검증과 확인을 거쳐야 해.</div><div id="draftManageList" class="draft-manage-list"></div>`;
    anchor.insertAdjacentElement('afterend',sec);
    q('#clearDrafts').onclick=clearAll;
  }
  function refresh(){
    ensurePanel();
    const list=q('#draftManageList');if(!list)return;
    const all=drafts();
    if(!all.length){list.innerHTML='<div class="empty compact">관리할 미등록 초안이 없어.</div>';return;}
    list.innerHTML=all.map((d,i)=>{
      const req=reqOf(d), p=req?.payload||{};
      const kind=isGrow(req)?'그로우':kindLabel(req?.kind);
      const label=labelOf(d,req);
      return `<article class="draft-manage-row" data-draft-index="${i}"><div class="draft-manage-top"><b>${escapeHtml(kind)}</b><span>${escapeHtml(whenOf(d))}</span></div><p>${escapeHtml(label)}</p><div class="draft-manage-actions"><button type="button" data-draft-load="${i}">불러오기 · 수정</button><button type="button" class="delete" data-draft-delete="${i}">삭제</button></div></article>`;
    }).join('');
    list.querySelectorAll('[data-draft-load]').forEach(b=>b.onclick=()=>loadDraft(Number(b.dataset.draftLoad)));
    list.querySelectorAll('[data-draft-delete]').forEach(b=>b.onclick=()=>deleteDraft(Number(b.dataset.draftDelete)));
  }
  function fill(id,value){const el=q(id);if(el)el.value=value??'';}
  function loadDraft(index){
    const d=drafts()[index], req=reqOf(d);if(!d||!req)return;
    const p=req.payload||{};
    if(isGrow(req)){
      q('#inputSheet')?.classList.remove('show');
      if(typeof openSheet==='function')openSheet('growSheet');else q('#growSheet')?.classList.add('show');
      fill('#growInput',p.text||d.text||'');
      if(q('#growResult'))q('#growResult').textContent='미등록 초안을 불러왔어. 수정 후 실행해도 바로 전송되지 않고 안전게이트를 다시 확인해.';
      return;
    }
    window.HFFieldInput?.open?.();
    window.HFFieldInput?.setKind?.(req.kind||p.entryType||'WORK');
    fill('#fieldTarget',p.target);
    fill('#fieldDate',p.date);
    fill('#fieldOwner',p.owner);
    fill('#fieldProcess',p.process);
    fill('#fieldPriority',req.priority||'NORMAL');
    fill('#fieldDetail',p.detail);
    fill('#fieldNewDate',p.newDate);
    fill('#fieldReason',p.changeReason);
    fill('#fieldIssueType',p.issueType||'품질');
    fill('#fieldNextAction',p.nextAction);
    fill('#fieldSupportType',p.supportType||'타부서지원');
    fill('#fieldParticipants',p.participants);
    if(q('#fieldResult'))q('#fieldResult').textContent='미등록 초안을 불러왔어. 필요한 내용을 수정한 뒤 다시 안전검증해.';
    q('#fieldConfirm')?.classList.add('hidden');
    q('#fieldTarget')?.focus();
  }
  function deleteDraft(index){
    const all=drafts();if(!all[index])return;
    if(!window.confirm('이 기기에 저장된 이 초안을 삭제할까? 운영 시트에는 영향이 없어.'))return;
    all.splice(index,1);saveAll(all);
  }
  function clearAll(){
    const all=drafts();if(!all.length)return;
    if(!window.confirm(`이 기기의 미등록 초안 ${all.length}건을 모두 삭제할까? 운영 시트에는 영향이 없어.`))return;
    saveAll([]);
  }
  function lockVersionLabel(){const brand=q('.brand small');if(brand)brand.textContent='리얼 0.4.4 · 초안 복구/관리';}
  function boot(){
    installStyle();ensurePanel();refresh();lockVersionLabel();
    const source=q('#entryDraftList');if(source)new MutationObserver(()=>refresh()).observe(source,{childList:true,subtree:true});
    window.addEventListener('storage',e=>{if(e.key===DRAFT_KEY)refresh();});
    window.addEventListener('focus',refresh);
    if(typeof renderCoreSource==='function'){
      const base=renderCoreSource;
      renderCoreSource=function(){base();lockVersionLabel();};
    }
    window.HFDraftManager={refresh,loadDraft,deleteDraft,clearAll,drafts};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
