'use strict';
const $=id=>document.getElementById(id);
const statusEl=$('status'),setupEl=$('setup'),logoutEl=$('logout');
function bindSecretToggles(){document.querySelectorAll('[data-secret]').forEach(button=>{button.onclick=()=>{const input=$(button.dataset.secret);if(!input)return;const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'숨기기':'보기';button.setAttribute('aria-pressed',show?'true':'false');};});}
async function call(body,{timeout=body?15000:2500}={}){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const r=await fetch('/api/sa2-auth',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:c.signal,headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});let d={};try{d=await r.json();}catch{}if(!r.ok||d.ok!==true){const e=Error(d.error||'auth_failed');e.status=r.status;e.data=d;throw e;}return d;}finally{clearTimeout(timer);}}
function showSetup(message='이름과 4자리 PIN을 입력하세요.'){setupEl.hidden=false;logoutEl.hidden=true;statusEl.textContent=message;}
function connected(user){setupEl.hidden=true;logoutEl.hidden=false;statusEl.textContent=(user.label||'내 계정')+' · 자동 연결됨';}
function loginError(e){
 if(e.message==='not_configured')return '이 테스트 앱의 서버 연결 설정이 누락되었습니다. 관리자에게 설정을 요청하세요. PIN 오류가 아닙니다.';
 if(e.message==='pin_denied')return 'PIN이 일치하지 않습니다. 기존 4자리 PIN을 확인하세요.';
 if(e.status===429)return '시도 횟수가 많습니다. 잠시 후 다시 시도하세요.';
 if(e.message==='invalid_origin')return '접속 주소를 확인하지 못했습니다. 앱을 다시 열어주세요.';
 if(e.name==='AbortError')return '서버 응답 시간이 초과되었습니다. 입력은 유지됩니다. 잠시 후 다시 연결하세요.';
 return '서버 연결에 실패했습니다. PIN 확인 결과가 아닙니다. 잠시 후 다시 연결하세요.';
}
async function start(){showSetup('바로 입력할 수 있습니다. 기존 연결 상태도 확인 중입니다.');try{const d=await call(null,{timeout:2500});if(d.user)return connected(d.user);statusEl.textContent='이름과 4자리 PIN을 입력하세요.';}catch(e){if(!setupEl.hidden)statusEl.textContent=loginError(e);}}
$('activateBtn').onclick=async()=>{const name=$('displayName').value.trim(),pin=$('pin').value.trim();if(!name){statusEl.textContent='이름을 입력하세요.';return;}if(!/^[0-9]{4}$/.test(pin)){statusEl.textContent='숫자 4자리 PIN을 입력하세요.';return;}$('activateBtn').disabled=true;statusEl.textContent='연결 중…';try{const d=await call({action:'activate',name,pin});$('pin').value='';connected(d.user);statusEl.textContent+=' · HandsFree로 이동합니다.';location.replace('/kmt-sa2/');}catch(e){statusEl.textContent=loginError(e);}finally{$('activateBtn').disabled=false;}};
logoutEl.onclick=async()=>{logoutEl.disabled=true;try{await call({action:'logout'});showSetup('이 기기 연결을 해제했습니다.');}catch{statusEl.textContent='연결 해제를 확인하지 못했습니다.';}finally{logoutEl.disabled=false;}};
bindSecretToggles();start();
