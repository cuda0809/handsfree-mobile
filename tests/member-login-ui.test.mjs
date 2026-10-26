import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
async function fixture(fail=false,ownerOnly=false){
 const elements=new Map(),saved=new Map(),calls=[];let moved='';
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false,textContent:'',dataset:{}});return elements.get(id);};
 const c=vm.createContext({document:{getElementById:get,querySelectorAll:()=>[]},AbortController,setTimeout,clearTimeout,localStorage:{setItem:(k,v)=>saved.set(k,v)},location:{replace:p=>moved=p},fetch:async(url,opt)=>{if(!opt.body)return {ok:true,status:200,json:async()=>({ok:true,memberEnabled:true,memberOwnerOnly:ownerOnly,user:null})};const b=JSON.parse(opt.body);calls.push(b);return {ok:!fail,status:fail?401:200,json:async()=>fail?{ok:false,error:'member_denied'}:{ok:true,user:{label:'검증자',team:'A',role:'member',memberId:'HFU-003',auth:'member'}}};}});
 vm.runInContext(fs.readFileSync('kmt-sa2/login.js','utf8'),c);await new Promise(r=>setImmediate(r));return {get,calls,saved,moved:()=>moved};
}
test('email-free enrollment exposes invitation and confirmation, fixes default team and clears only credentials on success',async()=>{
 const f=await fixture();assert.equal(f.get('memberModes').hidden,false);await f.get('memberEnrollMode').onclick();assert.equal(f.get('enrollFields').hidden,false);
 f.get('displayName').value='검증자';f.get('pin').value='619283';f.get('confirmPin').value='619283';f.get('inviteCode').value='fixture-one-use-code-1234';await f.get('activateBtn').onclick();
 assert.equal(f.calls[0].action,'enroll');assert.equal(f.calls[0].name,'검증자');assert.equal(f.calls[0].confirmPin,'619283');assert.equal(f.get('pin').value,'');assert.equal(f.get('inviteCode').value,'');assert.equal(f.saved.get('hf-selected-team-v1'),'A');assert.equal(f.moved(),'/kmt-sa2/');
});
test('personal login never sends the shared activation action and failure retains entered credentials',async()=>{
 const f=await fixture(true);f.get('displayName').value='검증자';f.get('pin').value='619283';await f.get('activateBtn').onclick();assert.equal(f.calls[0].action,'member-login');assert.equal(f.get('pin').value,'619283');assert.equal(f.get('activateBtn').disabled,false);assert.equal(f.moved(),'');assert.match(f.get('status').textContent,/초대코드/);
});

test('owner-only rollout keeps four-digit login available alongside personal master registration',async()=>{
 const f=await fixture(false,true);assert.equal(f.get('memberModes').hidden,false);assert.equal(f.get('legacyLoginMode').hidden,false);assert.equal(f.get('pin').maxLength,4);
 f.get('displayName').value='기존 팀원';f.get('pin').value='1234';await f.get('activateBtn').onclick();assert.equal(f.calls[0].action,'activate');
 f.get('memberEnrollMode').onclick();assert.equal(f.get('pin').maxLength,6);assert.equal(f.get('enrollFields').hidden,false);
 f.get('legacyLoginMode').onclick();assert.equal(f.get('pin').maxLength,4);assert.equal(f.get('enrollFields').hidden,true);
});
