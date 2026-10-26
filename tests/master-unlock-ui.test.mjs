import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function fixture(supported=false){
 const elements=new Map(),calls=[];const get=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',value:''});return elements.get(id);};
 const c=vm.createContext({document:{getElementById:get,querySelectorAll:()=>[]},AbortController,setTimeout,clearTimeout,memberLoad:async()=>{},...(supported?{PublicKeyCredential:{isUserVerifyingPlatformAuthenticatorAvailable:async()=>true},SimpleWebAuthnBrowser:{startAuthentication:async()=>{throw Object.assign(Error('cancelled'),{name:'NotAllowedError'});}}}:{}),fetch:async(_url,opts)=>{const b=JSON.parse(opts.body);b.action=b.action.replace(/^device-/,'');calls.push(b);return {ok:true,json:async()=>b.action==='status'?{ok:true,registered:true,unlocked:false}:{ok:true,options:{challenge:'fixture'}}};}});
 vm.runInContext(fs.readFileSync('kmt-sa2/master-unlock.js','utf8'),c);return {c,get,calls};
}
test('unsupported installed WebView retains PIN-only management fallback without claiming biometric support',async()=>{
 const f=fixture();assert.equal(await f.c.masterDeviceRefresh(),false);assert.equal(f.get('biometricUnlock').hidden,true);assert.match(f.get('deviceSupport').textContent,/지원하지 않습니다/);assert.equal(f.calls.length,1);
});
test('cancelled biometric authentication does not submit verification or replay management operations',async()=>{
 const f=fixture(true);await f.c.masterDeviceRefresh();assert.equal(f.get('biometricUnlock').hidden,false);await f.get('biometricUnlock').onclick();assert.deepEqual(f.calls.map(b=>b.action),['status','unlock-options']);assert.match(f.get('unlockMessage').textContent,/일반 앱 사용은 유지/);
});
