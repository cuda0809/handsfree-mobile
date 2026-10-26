'use strict';
const $=id=>document.getElementById(id);
const statusEl=$('status'),setupEl=$('setup'),logoutEl=$('logout');
let memberMode=false,enrollMode=false,ownerOnly=false;
function setLegacyMode(){memberMode=false;enrollMode=false;$('memberModes').hidden=!ownerOnly;$('legacyLoginMode').hidden=!ownerOnly;$('enrollFields').hidden=true;$('pinLabel').textContent='기존 4자리 PIN';$('pin').maxLength=4;$('pin').autocomplete='current-password';$('activateBtn').textContent='연결';}
$('legacyLoginMode').onclick=setLegacyMode;
function setMemberMode(enroll=false){memberMode=true;enrollMode=enroll;$('memberModes').hidden=false;$('enrollFields').hidden=!enroll;$('pinLabel').textContent=enroll?'새 개인 PIN · 숫자 6자리':'개인 PIN · 숫자 6자리';$('pin').maxLength=6;$('pin').autocomplete=enroll?'new-password':'current-password';$('activateBtn').textContent=enroll?'개인 계정 등록':'연결';}
$('memberLoginMode').onclick=()=>setMemberMode(false);$('memberEnrollMode').onclick=()=>setMemberMode(true);
function bindSecretToggles(){document.querySelectorAll('[data-secret]').forEach(button=>{button.onclick=()=>{const input=$(button.dataset.secret);if(!input)return;const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'숨기기':'보기';button.setAttribute('aria-pressed',show?'true':'false');};});}
async function call(body,{timeout=body?55000:15000}={}){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);try{const r=await fetch('/api/sa2-auth',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:c.signal,headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});let d={};try{d=await r.json();}catch{}if(!r.ok||d.ok!==true){const e=Error(d.error||'auth_failed');e.status=r.status;e.data=d;throw e;}return d;}finally{clearTimeout(timer);}}
function showSetup(message='이름과 4자리 PIN을 입력하세요.'){setupEl.hidden=false;logoutEl.hidden=true;statusEl.textContent=message;}
function connected(user){
 if(user.auth==='member'){try{localStorage.setItem('hf-selected-team-v1',user.team||'ALL');localStorage.setItem('hf-member-profile-v1',JSON.stringify({id:user.memberId,name:user.label,team:user.team,role:user.role,isMaster:user.isMaster===true}));}catch{}}
 if(!String(location.search||'').includes('manage=1')){location.replace('/kmt-sa2/');return;}
 if(ownerOnly&&user.auth!=='member'&&user.label==='이상준'){setMemberMode(true);setupEl.hidden=false;logoutEl.hidden=false;statusEl.textContent='기존 연결 유지 · 마스터 최초 등록';return;}
 if(user.auth==='member'&&user.isMaster){location.replace('/kmt-sa2/members.html');return;}
 setupEl.hidden=true;logoutEl.hidden=false;statusEl.textContent=(user.label||'내 계정')+' · 자동 연결됨';
}
function loginError(e){
 if(e.message==='not_configured')return '이 테스트 앱의 서버 연결 설정이 누락되었습니다. 관리자에게 설정을 요청하세요. PIN 오류가 아닙니다.';
 if(e.message==='registration_required'){setMemberMode(true);return '개인 계정 등록이 필요합니다. 이름·개별 초대코드·새 6자리 PIN을 입력하세요.';}
 if(e.message==='already_registered'){setMemberMode(false);return '이미 개인 계정이 등록되어 있습니다. 개인 PIN으로 로그인하세요.';}
 if(e.message==='member_denied')return '이름·개인 PIN 또는 초대코드를 확인하세요. 등록 전이라면 처음 등록을 선택하세요.';
 if(e.message==='member_locked')return '이 계정의 시도가 많아 10분간 잠겼습니다. 입력은 유지됩니다.';
 if(e.message==='pin_confirmation_mismatch')return '새 PIN과 확인 PIN이 다릅니다.';
 if(e.message==='invalid_member_input')return '이름과 숫자 6자리 개인 PIN을 입력하세요.';
 if(e.message==='auth_unavailable'||e.message==='member_auth_not_ready')return '계정 서버 확인이 지연되고 있습니다. 입력은 유지됩니다.';
 if(e.message==='pin_denied')return 'PIN이 일치하지 않습니다. 기존 4자리 PIN을 확인하세요.';
 if(e.status===429)return '시도 횟수가 많습니다. 잠시 후 다시 시도하세요.';
 if(e.message==='invalid_origin')return '접속 주소를 확인하지 못했습니다. 앱을 다시 열어주세요.';
 if(e.name==='AbortError')return '서버 응답 시간이 초과되었습니다. 입력은 유지됩니다. 잠시 후 다시 연결하세요.';
 return '서버 연결에 실패했습니다. PIN 확인 결과가 아닙니다. 잠시 후 다시 연결하세요.';
}
async function start(){showSetup('바로 입력할 수 있습니다. 기존 연결 상태도 확인 중입니다.');try{const d=await call(null,{timeout:15000});ownerOnly=d.memberOwnerOnly===true;$('legacyLoginMode').hidden=!ownerOnly;if(d.memberEnabled&&!ownerOnly)setMemberMode(enrollMode);else{setLegacyMode();}if(d.migrationRequired){setMemberMode(true);showSetup('기존 자료는 보존되어 있습니다. 개별 초대코드로 개인 계정을 등록하세요.');return;}if(d.user)return connected(d.user);statusEl.textContent=memberMode?'이름과 6자리 개인 PIN을 입력하세요.':'이름과 4자리 PIN을 입력하세요.';}catch(e){if(!setupEl.hidden)statusEl.textContent=loginError(e);}}
$('activateBtn').onclick=async()=>{const name=$('displayName').value.trim(),pin=$('pin').value.trim();if(!name){statusEl.textContent='이름을 입력하세요.';return;}if(!(memberMode?/^[0-9]{6}$/:/^[0-9]{4}$/).test(pin)){statusEl.textContent=memberMode?'숫자 6자리 개인 PIN을 입력하세요.':'숫자 4자리 PIN을 입력하세요.';return;}$('activateBtn').disabled=true;statusEl.textContent='연결 중…';try{const d=await call(memberMode?{action:enrollMode?'enroll':'member-login',name,pin,...(enrollMode?{code:$('inviteCode').value.trim(),confirmPin:$('confirmPin').value}: {})}:{action:'activate',name,pin});$('pin').value='';$('confirmPin').value='';$('inviteCode').value='';connected(d.user);statusEl.textContent+=' · HandsFree로 이동합니다.';location.replace('/kmt-sa2/');}catch(e){statusEl.textContent=loginError(e);}finally{$('activateBtn').disabled=false;}};
logoutEl.onclick=async()=>{logoutEl.disabled=true;try{await call({action:'logout'});showSetup('이 기기 연결을 해제했습니다.');}catch{statusEl.textContent='연결 해제를 확인하지 못했습니다.';}finally{logoutEl.disabled=false;}};
setMemberMode(false);bindSecretToggles();start();
