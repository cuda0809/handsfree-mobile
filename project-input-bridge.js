// HandsFree Mobile REAL 0.4.3 — project detail -> field input bridge.
(() => {
  const q=(s)=>document.querySelector(s);

  function currentProject(){
    const job=(q('#detailJob')?.textContent||'').trim();
    try{
      const p=typeof projectRows==='function'?projectRows().find(x=>String(x.job)===job):null;
      if(p)return p;
    }catch(_){/* fallback below */}
    const title=(q('#detailTitle')?.textContent||'').trim();
    const [customer,device]=title.split('·').map(x=>x.trim());
    return {job,customer,device};
  }
  function openInput(kind){
    const p=currentProject();
    q('#fieldReset')?.click();
    q('#detailSheet')?.classList.remove('show');
    if(window.HFFieldInput?.openForProject) window.HFFieldInput.openForProject(p,kind);
  }
  function inject(){
    const body=q('#detailBody');
    if(!body||!body.children.length||body.querySelector('.pd-input-actions'))return;
    const box=document.createElement('div');
    box.className='pd-input-actions';
    box.innerHTML='<button type="button" data-pd-kind="WORK">업무기록</button><button type="button" data-pd-kind="CHANGE">일정변경</button><button type="button" data-pd-kind="ISSUE">이슈등록</button>';
    box.addEventListener('click',e=>{
      const b=e.target.closest('[data-pd-kind]');
      if(b)openInput(b.dataset.pdKind);
    });
    const decision=body.querySelector('.pd-decision');
    if(decision)decision.insertAdjacentElement('afterend',box);else body.prepend(box);
  }
  function installStyle(){
    if(q('#pd-input-style'))return;
    const style=document.createElement('style');
    style.id='pd-input-style';
    style.textContent='.pd-input-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0 13px}.pd-input-actions button{border:1px solid #c7d8ea;background:#f4f8ff;color:#2d5f91;border-radius:10px;padding:9px 5px;font-size:9px;font-weight:900}.pd-input-actions button:nth-child(3){background:#fff4e8;border-color:#efd3ae;color:#8d5b17}';
    document.head.appendChild(style);
  }
  function lockVersionLabel(){
    const brand=q('.brand small');
    if(brand)brand.textContent='리얼 0.4.3 · 현장 입력 통합';
  }
  function boot(){
    installStyle();
    const body=q('#detailBody');
    if(body)new MutationObserver(()=>inject()).observe(body,{childList:true,subtree:true});
    inject();
    lockVersionLabel();
    if(typeof renderCoreSource==='function'){
      const base=renderCoreSource;
      renderCoreSource=function(){base();lockVersionLabel();};
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

// Load the REAL 0.7 LIVE FOCUS presentation layer before later UI enhancers.
if(document.readyState==='loading'){
  document.write('<script src="/ui-focus-v07.js?v=0705"><\/script><script src="/ui-focus-v07-fix.js?v=0705"><\/script>');
}else{
  const a=document.createElement('script');a.src='/ui-focus-v07.js?v=0705';a.onload=()=>{const b=document.createElement('script');b.src='/ui-focus-v07-fix.js?v=0705';document.head.appendChild(b);};document.head.appendChild(a);
}
