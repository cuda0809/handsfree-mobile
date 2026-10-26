'use strict';
let masterDeviceState=null,masterUnlockBusy=false;
const unlockBox=document.getElementById('masterUnlock'),unlockMessage=document.getElementById('unlockMessage');
async function deviceRequest(body){const c=new AbortController(),timer=setTimeout(()=>c.abort(),35000);try{const r=await fetch('/api/sa2-device',{method:'POST',credentials:'same-origin',cache:'no-store',signal:c.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'failed');return d;}finally{clearTimeout(timer);}}
function unlockError(e){if(e.name==='NotAllowedError'||e.name==='AbortError')return '인증을 완료하지 않았습니다. 일반 앱 사용은 유지됩니다.';return ({member_denied:'개인 PIN을 확인하세요.',member_locked:'시도가 많아 잠겼습니다. 10분 후 다시 시도하세요.',admin_unlock_required:'관리 기능을 사용하려면 본인 확인이 필요합니다.',device_not_registered:'먼저 개인 PIN으로 확인한 뒤 이 기기의 생체인증을 등록하세요.',device_verification_failed:'인증 결과를 확인하지 못했습니다. 일반 앱 연결은 유지됩니다.',challenge_expired:'인증 시간이 지났습니다. 다시 눌러 주세요.'})[e.message]||'본인 확인을 완료하지 못했습니다. 입력·관리 요청은 자동 재전송하지 않습니다.';}
async function masterDeviceRefresh(){
 masterDeviceState=await deviceRequest({action:'status'});
 const supported=typeof PublicKeyCredential!=='undefined'&&typeof SimpleWebAuthnBrowser!=='undefined'&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(()=>false);
 document.getElementById('biometricUnlock').hidden=!supported||!masterDeviceState.registered;
 document.getElementById('registerBiometric').hidden=!supported||masterDeviceState.registered||!masterDeviceState.unlocked;
 document.getElementById('deviceSupport').textContent=supported?'지문·얼굴인식 또는 기기 화면 잠금으로 확인합니다. 생체정보는 서버에 저장하지 않습니다.':'현재 앱은 생체인증을 지원하지 않습니다. 관리 기능에서만 개인 PIN을 사용하며 평소에는 자동 연결됩니다.';
 unlockBox.hidden=masterDeviceState.unlocked;
 return masterDeviceState.unlocked;
}
async function masterUnlockAction(run){if(masterUnlockBusy)return;masterUnlockBusy=true;document.querySelectorAll('#masterUnlock button').forEach(b=>b.disabled=true);unlockMessage.textContent='본인 확인 중…';try{await run();document.getElementById('adminPin').value='';unlockMessage.textContent='확인 완료 · 관리 권한은 5분간 유지됩니다.';await masterDeviceRefresh();await memberLoad();}catch(e){unlockMessage.textContent=unlockError(e);}finally{masterUnlockBusy=false;document.querySelectorAll('#masterUnlock button').forEach(b=>b.disabled=false);}}
document.getElementById('pinUnlock').onclick=()=>masterUnlockAction(()=>deviceRequest({action:'pin-unlock',pin:document.getElementById('adminPin').value}));
document.getElementById('biometricUnlock').onclick=()=>masterUnlockAction(async()=>{const d=await deviceRequest({action:'unlock-options'}),response=await SimpleWebAuthnBrowser.startAuthentication({optionsJSON:d.options});await deviceRequest({action:'unlock-verify',response});});
document.getElementById('registerBiometric').onclick=()=>masterUnlockAction(async()=>{const d=await deviceRequest({action:'register-options'}),response=await SimpleWebAuthnBrowser.startRegistration({optionsJSON:d.options});await deviceRequest({action:'register-verify',response});});
