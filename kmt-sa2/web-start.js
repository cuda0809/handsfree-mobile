'use strict';
// Keep identity checks outside the work UI: never cache or fabricate a login.
const WEB_SCRIPTS=["./mobile.js?v=20261022m25", "./theme.js?v=20261022m25", "./schedule.js?v=20261022m25", "./production-rules.js?v=20261022m25", "./issue-context.js?v=20261022m25", "./app-flow.js?v=20261022m25", "./issue-workspace.js?v=20261022m25", "./equipment-photos.js?v=20261022m25", "./live-refresh.js?v=20261022m25", "./web-shell.js?v=20261022web1"];
let webStarting=false;
async function startWeb(){
 if(webStarting)return;webStarting=true;
 const status=document.getElementById('webBootStatus'),retry=document.getElementById('webBootRetry');
 retry.hidden=true;document.getElementById('webBootLogin').hidden=true;
 const control=new AbortController(),timer=setTimeout(()=>control.abort(),12000);
 try{
  const r=await fetch('/api/sa2-auth',{credentials:'same-origin',cache:'no-store',signal:control.signal});
  const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'session_check_failed');
  if(!d.user){location.replace('./login.html');return;}
  window.hfWebUser=d.user;
  for(const src of WEB_SCRIPTS){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(Error('asset_failed'));document.body.appendChild(script);});}
  document.documentElement.classList.remove('web-boot');
 }catch(e){
  if(status)status.textContent=e.message==='not_configured'?'웹 서버 연결 설정을 확인해야 합니다. 로그인 정보 오류가 아닙니다.':e.message==='asset_failed'?'화면 파일을 불러오지 못했습니다. 다시 확인을 눌러주세요.':'연결 상태를 확인하지 못했습니다. 네트워크를 확인하고 다시 시도하세요.';
  retry.hidden=false;retry.onclick=()=>location.reload();document.getElementById('webBootLogin').hidden=false;
 }finally{clearTimeout(timer);webStarting=false;}
}
startWeb();
