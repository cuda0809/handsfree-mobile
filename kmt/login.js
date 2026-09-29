'use strict';
const RECOVERY='hf-simple-recovery-v2';
const $=id=>document.getElementById(id);
const statusEl=$('status'),bootstrapEl=$('bootstrap'),profileEl=$('profile'),pinLoginEl=$('pinLogin'),logoutEl=$('logout');
let profiles=[];

async function call(body){
 const r=await fetch('/api/simple-auth',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 let d={};try{d=await r.json();}catch{}
 if(!r.ok||d.ok!==true){const e=Error(d.error||'auth_failed');e.status=r.status;e.data=d;throw e;}return d;
}
function hideAll(){bootstrapEl.hidden=profileEl.hidden=pinLoginEl.hidden=logoutEl.hidden=true;}
function recovery(){try{return JSON.parse(localStorage.getItem(RECOVERY)||'null');}catch{return null;}}
function setRecovery(v){localStorage.setItem(RECOVERY,JSON.stringify(v));}
function clearRecovery(){localStorage.removeItem(RECOVERY);}
function connected(user){hideAll();logoutEl.hidden=false;statusEl.textContent=(user.label||'내 계정')+' · '+({owner:'관리자',writer:'입력 담당',reader:'조회 담당'})[user.role]+' · 자동 연결됨';}
function showBootstrap(){hideAll();bootstrapEl.hidden=false;statusEl.textContent='새 기기입니다. 관리자 등록키는 이번 한 번만 입력합니다.';}
function showProfiles(list){profiles=list||[];hideAll();profileEl.hidden=false;$('profileSelect').innerHTML=profiles.map(x=>'<option value="'+x.id+'">'+x.label+'</option>').join('');statusEl.textContent='내 이름을 선택하고 사용할 4자리 PIN을 정하세요.';}
function showPin(rec){hideAll();pinLoginEl.hidden=false;$('pinName').textContent=rec.label||'내 계정';statusEl.textContent='4자리 PIN만 입력하면 다시 연결됩니다.';}

async function start(){
 try{
  const d=await call();
  if(d.user)return connected(d.user);
  const rec=recovery();
  if(rec?.token)return showPin(rec);
  if(d.bootstrap&&d.profiles?.length)return showProfiles(d.profiles);
  showBootstrap();
 }catch{statusEl.textContent='연결 상태를 확인하지 못했습니다.';}
}

$('bootstrapBtn').onclick=async()=>{
 const key=$('adminKey').value.trim();if(!key){statusEl.textContent='관리자 등록키를 입력하세요.';return;}
 $('bootstrapBtn').disabled=true;statusEl.textContent='기기를 등록하는 중…';
 try{const d=await call({action:'bootstrap',key});$('adminKey').value='';showProfiles(d.profiles);}
 catch{statusEl.textContent='등록키를 확인하세요.';}
 finally{$('bootstrapBtn').disabled=false;}
};

$('activateBtn').onclick=async()=>{
 const profileId=$('profileSelect').value,pin=$('newPin').value.trim();
 if(!/^[0-9]{4}$/.test(pin)){statusEl.textContent='숫자 4자리 PIN을 입력하세요.';return;}
 $('activateBtn').disabled=true;statusEl.textContent='연결 중…';
 try{
  const d=await call({action:'activate',profileId,pin});
  setRecovery({token:d.recoveryToken,label:d.user.label});
  $('newPin').value='';connected(d.user);statusEl.textContent+=' · HandsFree로 이동합니다.';setTimeout(()=>location.replace('/kmt/'),350);
 }catch(e){statusEl.textContent=e.data?.error==='bootstrap_required'?'처음 등록 시간이 지났습니다. 관리자 등록을 다시 해주세요.':'연결하지 못했습니다.';}
 finally{$('activateBtn').disabled=false;}
};

$('pinBtn').onclick=async()=>{
 const rec=recovery(),pin=$('pin').value.trim();
 if(!rec?.token)return showBootstrap();
 if(!/^[0-9]{4}$/.test(pin)){statusEl.textContent='숫자 4자리 PIN을 입력하세요.';return;}
 $('pinBtn').disabled=true;statusEl.textContent='연결 중…';
 try{const d=await call({action:'pinLogin',token:rec.token,pin});$('pin').value='';connected(d.user);setTimeout(()=>location.replace('/kmt/'),300);}
 catch{statusEl.textContent='PIN을 확인하세요.';}
 finally{$('pinBtn').disabled=false;}
};

$('resetBtn').onclick=()=>{clearRecovery();showBootstrap();};
logoutEl.onclick=async()=>{logoutEl.disabled=true;try{await call({action:'logout'});clearRecovery();showBootstrap();statusEl.textContent='이 기기 연결을 해제했습니다.';}catch{statusEl.textContent='연결 해제를 확인하지 못했습니다.';}finally{logoutEl.disabled=false;}};
window.addEventListener('load',start);
