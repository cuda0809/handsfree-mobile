'use strict';
const RECOVERY='hf-simple-recovery-v2';
const $=id=>document.getElementById(id);
const statusEl=$('status'),profileEl=$('profile'),pinLoginEl=$('pinLogin'),logoutEl=$('logout');
let profiles=[];
function bindSecretToggles(){document.querySelectorAll('[data-secret]').forEach(button=>{button.onclick=()=>{const input=$(button.dataset.secret);if(!input)return;const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'숨기기':'보기';button.setAttribute('aria-pressed',show?'true':'false');};});}
async function call(body){const r=await fetch('/api/simple-auth',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});let d={};try{d=await r.json();}catch{}if(!r.ok||d.ok!==true){const e=Error(d.error||'auth_failed');e.status=r.status;e.data=d;throw e;}return d;}
function hideAll(){profileEl.hidden=pinLoginEl.hidden=logoutEl.hidden=true;}
function recovery(){try{return JSON.parse(localStorage.getItem(RECOVERY)||'null');}catch{return null;}}
function setRecovery(v){localStorage.setItem(RECOVERY,JSON.stringify(v));}
function clearRecovery(){localStorage.removeItem(RECOVERY);}
function connected(user){hideAll();logoutEl.hidden=false;statusEl.textContent=(user.label||'내 계정')+' · '+({owner:'관리자',writer:'입력 담당',reader:'조회 담당'})[user.role]+' · 자동 연결됨';}
function showProfiles(list){profiles=list||[];hideAll();profileEl.hidden=false;$('profileSelect').innerHTML=profiles.map(x=>'<option value="'+x.id+'">'+x.label+'</option>').join('');statusEl.textContent=profiles.length?'내 이름을 선택하고 사용할 4자리 PIN을 정하세요.':'등록된 사용자가 없습니다.';}
function showPin(rec){hideAll();pinLoginEl.hidden=false;$('pinName').textContent=rec.label||'내 계정';statusEl.textContent='4자리 PIN만 입력하면 다시 연결됩니다.';}
async function start(){try{const d=await call();if(d.user)return connected(d.user);const rec=recovery();if(rec?.token)return showPin(rec);showProfiles(d.profiles||[]);}catch{statusEl.textContent='연결 상태를 확인하지 못했습니다.';}}
$('activateBtn').onclick=async()=>{const profileId=$('profileSelect').value,pin=$('newPin').value.trim();if(!profileId){statusEl.textContent='내 이름을 선택하세요.';return;}if(!/^[0-9]{4}$/.test(pin)){statusEl.textContent='숫자 4자리 PIN을 입력하세요.';return;}$('activateBtn').disabled=true;statusEl.textContent='연결 중…';try{const d=await call({action:'activate',profileId,pin});setRecovery({token:d.recoveryToken,label:d.user.label});$('newPin').value='';connected(d.user);statusEl.textContent+=' · HandsFree로 이동합니다.';setTimeout(()=>location.replace('/kmt/'),350);}catch{statusEl.textContent='연결하지 못했습니다. 사용자 권한을 확인하세요.';}finally{$('activateBtn').disabled=false;}};
$('pinBtn').onclick=async()=>{const rec=recovery(),pin=$('pin').value.trim();if(!rec?.token)return start();if(!/^[0-9]{4}$/.test(pin)){statusEl.textContent='숫자 4자리 PIN을 입력하세요.';return;}$('pinBtn').disabled=true;statusEl.textContent='연결 중…';try{const d=await call({action:'pinLogin',token:rec.token,pin});$('pin').value='';connected(d.user);setTimeout(()=>location.replace('/kmt/'),300);}catch{statusEl.textContent='PIN을 확인하세요.';}finally{$('pinBtn').disabled=false;}};
$('resetBtn').onclick=async()=>{clearRecovery();await start();};
logoutEl.onclick=async()=>{logoutEl.disabled=true;try{await call({action:'logout'});clearRecovery();await start();statusEl.textContent='이 기기 연결을 해제했습니다.';}catch{statusEl.textContent='연결 해제를 확인하지 못했습니다.';}finally{logoutEl.disabled=false;}};
window.addEventListener('load',()=>{bindSecretToggles();start();});
