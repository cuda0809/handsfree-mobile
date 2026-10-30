'use strict';
const $=id=>document.getElementById(id);let mode='login',busy=false,signedMember=false;
async function accountRequest(body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),35000);try{const r=await fetch('/api/sa2-auth',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:c.signal,headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'auth_unavailable');return d;}finally{clearTimeout(timer);}}
function validateConfirmation(){
 const field=$('confirmPassword'),active=mode!=='login',expected=$(mode==='change'?'newPassword':'password').value;
 const message=!active?'':!field.value?'비밀번호를 한 번 더 입력하세요.':field.value!==expected?'비밀번호가 일치하지 않습니다.':'';
 field.setCustomValidity?.(message);field.setAttribute?.('aria-invalid',message&&field.value?'true':'false');
 $('passwordMatch').textContent=!active||!field.value?'':message||'비밀번호가 일치합니다.';
 return !message;
}
function setMode(next){
 mode=next;
 $('heading').textContent=next==='signup'?'회원가입':next==='change'?'비밀번호 변경':'로그인';
 $('submit').textContent=$('heading').textContent;
 $('nameField').hidden=next!=='signup';$('newFields').hidden=next==='login';$('newPasswordField').hidden=next!=='change';
 $('signupMode').hidden=next!=='login';$('loginMode').hidden=next==='login';$('changeMode').hidden=next!=='login'||!signedMember;
 $('passwordLabel').textContent=next==='change'?'현재 비밀번호':'비밀번호';
 $('password').autocomplete=next==='signup'?'new-password':'current-password';$('password').minLength=next==='signup'?10:0;
 for(const [id,enabled] of [['displayName',next==='signup'],['newPassword',next==='change'],['confirmPassword',next!=='login']]){$(id).disabled=!enabled;$(id).required=enabled;}
 $('intro').textContent=next==='signup'?'이름을 확인하고 사용할 아이디와 비밀번호를 만들어 주세요.':next==='change'?'현재 비밀번호와 새 비밀번호를 입력하세요.':'아이디와 비밀번호를 입력하세요.';
 $('status').textContent='';validateConfirmation();
}
function accountError(e){return ({account_pending:'가입 신청이 저장되었습니다. 담당자 승인 후 로그인할 수 있습니다.',account_denied:'아이디 또는 비밀번호를 확인하세요.',username_taken:'이미 사용 중인 아이디입니다.',member_account_exists:'이름에 연결된 가입 신청 또는 계정이 있습니다. 관리자에게 확인해 주세요.',member_denied:'사내 등록 이름을 확인하세요.',member_locked:'시도가 많아 10분간 잠겼습니다.',invalid_username:'아이디는 영문·숫자로 시작하는 4~32자입니다. 점·밑줄·하이픈도 사용할 수 있습니다.',invalid_password:'비밀번호는 10~128자로 입력하세요.',password_confirmation_mismatch:'비밀번호 확인이 일치하지 않습니다.',registration_required:'로그인 후 비밀번호를 변경하세요.'})[e.message]||(e.name==='AbortError'?'응답을 확인하지 못했습니다. 입력은 보존됩니다. 자동 재전송하지 않습니다.':'서버 연결을 확인하지 못했습니다. 입력은 보존됩니다.');}
function connected(user){signedMember=user.auth==='member';try{if(user.auth==='member')localStorage.setItem('hf-selected-team-v1',user.team||'ALL');}catch{}if(!location.search.includes('manage=1')){location.replace('/kmt-sa2/');return;}$('logout').hidden=false;$('returnApp').hidden=false;$('changeMode').hidden=user.auth!=='member';if(user.auth==='member'){$('status').textContent=user.label+' · 로그인되어 있습니다.';}else{$('status').textContent='현재 앱 연결은 유지됩니다. 사용할 아이디를 회원가입에서 만들어 주세요.';}}
$('accountForm').onsubmit=async event=>{event.preventDefault();if(busy)return;if(!validateConfirmation()){$('status').textContent=$('confirmPassword').value?'비밀번호 확인이 일치하지 않습니다.':'비밀번호 확인을 입력하세요.';$('confirmPassword').focus?.();$('accountForm').reportValidity?.();return;}if($('accountForm').reportValidity?.()===false)return;busy=true;$('submit').disabled=true;$('status').textContent='확인 중…';try{const body={action:'account-'+(mode==='signup'?'signup':mode==='change'?'change':'login'),username:$('username').value,name:$('displayName').value,password:$('password').value,newPassword:$('newPassword').value,confirmPassword:$('confirmPassword').value};const d=await accountRequest(body);for(const id of ['password','newPassword','confirmPassword'])$(id).value='';if(d.pending){setMode('login');$('status').textContent='가입 신청이 저장되었습니다. 담당자 승인 후 로그인할 수 있습니다.';return;}connected(d.user);if(mode==='change'){$('status').textContent='비밀번호를 변경했습니다. 이 기기는 연결을 유지하며 다른 기기는 다시 로그인해야 합니다.';}else location.replace('/kmt-sa2/');}catch(e){$('status').textContent=accountError(e);}finally{busy=false;$('submit').disabled=false;}};
$('signupMode').onclick=()=>setMode('signup');$('loginMode').onclick=()=>setMode('login');$('changeMode').onclick=()=>setMode('change');
$('logout').onclick=async()=>{if(busy)return;try{await accountRequest({action:'logout'});signedMember=false;$('logout').hidden=true;$('changeMode').hidden=true;$('returnApp').hidden=true;setMode('login');}catch(e){$('status').textContent=accountError(e);}};
document.querySelectorAll('[data-secret]').forEach(b=>b.onclick=()=>{const input=$(b.dataset.secret),show=input.type==='password';input.type=show?'text':'password';b.textContent=show?'숨기기':'보기';});
for(const id of ['password','newPassword','confirmPassword']){$(id).oninput=validateConfirmation;$(id).onchange=validateConfirmation;}
setMode('login');
(async()=>{try{const d=await accountRequest();if(d.user){connected(d.user);if(d.user.auth==='member'&&location.search.includes('manage=1')){const a=await accountRequest({action:'account-self'});$('username').value=a.username||'';}}}catch(e){$('status').textContent=accountError(e);}})();
// Account pages also update the worker so an old open PIN page is retired.
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
