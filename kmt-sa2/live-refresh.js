// Refresh data in the running app. Never reload the page or retransmit a write.
let liveRefreshPending=null,liveRenderDeferred=false;
const liveRenderBase=renderCoreScreen,liveBannerBase=banner;
function liveRefreshEditing(){
 const active=document.activeElement;
 return dialog.open||!!recognition||(typeof todayIssueRecognition!=='undefined'&&!!todayIssueRecognition)||!!active?.matches?.('input,textarea,select,[contenteditable="true"]')||
  Array.from(document.querySelectorAll('textarea')).some(x=>x.value.trim())||
  notes().some(x=>x.status==='sending')||!!document.querySelector('button[data-today-save]:disabled,#generalIssueSave:disabled');
}
function liveRefreshControls(){
 const host=document.querySelector('.hf-connection-row');if(!host)return;
 let button=$('hfRefreshNow');
 if(!button){button=document.createElement('button');button.id='hfRefreshNow';button.className='chip';button.onclick=()=>refreshLiveData(true);}
 if(button.parentElement!==host)host.appendChild(button);
 button.disabled=!!liveRefreshPending||!!readPending;
 button.textContent=button.disabled?'갱신 중…':liveRenderDeferred?'새 자료 반영':'↻ 지금 갱신';
 button.setAttribute('aria-label','현재 화면 데이터 갱신');
 let status=$('hfRefreshStatus');
 if(!status){status=document.createElement('small');status.id='hfRefreshStatus';status.className='note';}
 if(status.parentElement!==host)host.appendChild(status);
 status.textContent=liveRenderDeferred?'새 자료 도착 · 입력을 마치면 반영':readStale?'최신 확인 필요':lastRead?'자동 갱신 · 마지막 확인 '+lastRead:'자동 갱신 대기';
}
banner=function(){liveBannerBase();liveRefreshControls();};
renderCoreScreen=function(){
 if(liveRefreshEditing()){liveRenderDeferred=true;liveRefreshControls();return;}
 const x=window.scrollX||0,y=window.scrollY||0;
 const search=$('hybridProjectSearch')?.value;
 liveRenderBase();
 if(search&&$('hybridProjectSearch')){$('hybridProjectSearch').value=search;if(typeof renderHybridProjects==='function')renderHybridProjects();}
 window.scrollTo(x,y);liveRenderDeferred=false;liveRefreshControls();
};
function flushLiveRender(){
 if(!liveRenderDeferred||liveRefreshEditing())return;
 try{renderCoreScreen();}catch{readStale=true;readMessage='화면 반영 실패 · 지금 갱신을 눌러주세요';banner();}
}
async function refreshLiveData(manual=false){
 if(document.visibilityState==='hidden'||navigator.onLine===false)return false;
 if(liveRefreshPending)return liveRefreshPending;
 if(!manual&&(lastReadErrorStatus===401||lastReadErrorStatus===403))return false;
 if(!manual&&Date.now()-lastCoreAttempt<30000)return false;
 liveRefreshPending=(async()=>{
  const core=await refresh(true);
  let plans=true;
  if(core&&typeof syncPlanOverview==='function'&&(manual||Date.now()-lastPlanAttempt>=120000))plans=!!await syncPlanOverview(true);
  if(typeof reconcileEventReceipts==='function')await reconcileEventReceipts();
  return core===true&&plans;
 })().finally(()=>{liveRefreshPending=null;flushLiveRender();liveRefreshControls();});
 liveRefreshControls();return liveRefreshPending;
}
setInterval(()=>refreshLiveData(false),30000);
// Existing resume handling may already start a Core request; refresh() joins it.
window.addEventListener('focus',()=>refreshLiveData(false));
document.addEventListener('visibilitychange',()=>refreshLiveData(false));
document.addEventListener('focusout',()=>setTimeout(flushLiveRender,0));
document.addEventListener('input',()=>setTimeout(flushLiveRender,0));
dialog.addEventListener('close',flushLiveRender);
liveRefreshControls();
