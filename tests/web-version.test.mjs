import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('kmt-sa2/login.js','utf8');
const settle=()=>new Promise(r=>setImmediate(r));
function fixture(responses){
 const els=Object.fromEntries(['status','setup','logout','displayName','pin','activateBtn','continueBtn'].map(k=>[k,{value:k==='pin'?'1234':k==='displayName'?'Fixture':'',hidden:false,disabled:false}]));
 const calls=[],navigation=[];
 const c=vm.createContext({document:{getElementById:k=>els[k],querySelectorAll:()=>[]},AbortController,setTimeout,clearTimeout,location:{replace:p=>navigation.push(p)},fetch:async(u,o)=>{calls.push(o);const d=responses.shift();if(d instanceof Error)throw d;return {ok:true,status:200,json:async()=>d};}});
 vm.runInContext(source,c);return {c,els,calls,navigation};
}
test('web login verifies cookie roundtrip before navigation, clears PIN only after confirmation',async()=>{
 const f=fixture([{ok:true,user:null},{ok:true,user:{label:'Fixture'}},{ok:true,user:{label:'Fixture'}}]);await settle();
 await f.els.setup.onsubmit({preventDefault(){}});assert.deepEqual(f.calls.map(x=>x.method),['GET','POST','GET']);assert.deepEqual(f.navigation,['/kmt-sa2/']);assert.equal(f.els.pin.value,'');assert.equal(f.els.activateBtn.disabled,false);
});
test('lost session or verification outage never navigates or discards input',async()=>{
 for(const response of [{ok:true,user:null},new Error('network')]){
  const f=fixture([{ok:true,user:null},{ok:true,user:{label:'Fixture'}},response]);await settle();await f.els.setup.onsubmit({preventDefault(){}});
  assert.equal(f.navigation.length,0);assert.equal(f.els.pin.value,'1234');assert.equal(f.els.activateBtn.disabled,false);
 }
});
test('an already connected browser can enter without submitting credentials',async()=>{
 const f=fixture([{ok:true,user:{label:'Fixture'}}]);await settle();assert.equal(f.els.setup.hidden,true);assert.equal(f.els.continueBtn.hidden,false);assert.equal(f.calls.length,1);
});
test('unauthenticated web boot opens login before loading operational scripts',async()=>{
 const els={webBootStatus:{},webBootRetry:{},webBootLogin:{}};let scripts=0,path;
 const c=vm.createContext({document:{getElementById:k=>els[k],body:{appendChild(){scripts++;}}},AbortController,setTimeout,clearTimeout,location:{replace:p=>path=p},fetch:async()=>({ok:true,json:async()=>({ok:true,user:null})})});
 vm.runInContext(fs.readFileSync('kmt-sa2/web-start.js','utf8'),c);await settle();assert.equal(path,'./login.html');assert.equal(scripts,0);
});
test('copy retains existing operational scripts and avoids service-worker installation',()=>{
 const start=fs.readFileSync('kmt-sa2/web-start.js','utf8'),mobile=fs.readFileSync('kmt-sa2/mobile.js','utf8');
 for(const name of ['app-flow','issue-context','issue-workspace','equipment-photos','live-refresh'])assert.ok(start.includes(name+'.js'));
 assert.doesNotMatch(mobile,/serviceWorker\.register/);assert.doesNotMatch(source,/localStorage|sessionStorage/);
 const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));assert.equal(config.redirects[0].destination,'/kmt-sa2/');
});
