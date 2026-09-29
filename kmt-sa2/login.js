'use strict';
const $=id=>document.getElementById(id);
const statusEl=$('status'),setupEl=$('setup'),logoutEl=$('logout');
function bindSecretToggles(){document.querySelectorAll('[data-secret]').forEach(button=>{button.onclick=()=>{const input=$(button.dataset.secret);if(!input)return;const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'숨기기':'보기';button.setAttribute('aria-pressed',show?'true':'false');};});}
async function call(body){const r=await fetch('/api/sa2-auth',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});let d={};try{d=await r.json();}catch{}if(!r.ok||d.ok!==true){const e=Error(d.error||'auth_failed');e.status=r.status;e.data=d;throw e;}return d;}
function showSetup(message='이름과 4자리 PIN을 입력하세요.'){setupEl.hidden=false;logoutEl.hidden=true;statusEl.textContent=message;}
function connected(user){setupEl.hidden=true;logoutEl.hidden=false;statusEl.textContent=(user.label||'내 계정')+' · 자동 연결됨';}
async function start(){try{const d=await call();if(d.user)return connected(d.user);showSetup();}catch{showSetup('연결 상태를 확인하지 못했습니다. 다시 시도하세요.');}}
$('activateBtn').onclick=async()=>{const name=$('displayName').value.trim(),pin=$('pin').value.trim();if(!name){statusEl.textContent='이름을 입력하세요.';return;}if(!/^[0-9]{4}$/.test(pin)){statusEl.textContent='숫자 4자리 PIN을 입력하세요.';return;}$('activateBtn').disabled=true;statusEl.textContent='연결 중…';try{const d=await call({action:'activate',name,pin});$('pin').value='';connected(d.user);statusEl.textContent+=' · HandsFree로 이동합니다.';setTimeout(()=>location.replace('/kmt-sa2/'),300);}catch(e){statusEl.textContent=e.status===429?'잠시 후 다시 시도하세요.':'PIN을 확인하세요.';}finally{$('activateBtn').disabled=false;}};
logoutEl.onclick=async()=>{logoutEl.disabled=true;try{await call({action:'logout'});showSetup('이 기기 연결을 해제했습니다.');}catch{statusEl.textContent='연결 해제를 확인하지 못했습니다.';}finally{logoutEl.disabled=false;}};
window.addEventListener('load',()=>{bindSecretToggles();start();});
