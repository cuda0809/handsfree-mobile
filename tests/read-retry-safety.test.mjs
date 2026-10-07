import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const mobile=fs.readFileSync('kmt-sa2/mobile.js','utf8');
const code=mobile.slice(mobile.indexOf('async function readApp('),mobile.indexOf('function coreProcessFromState('));
function harness(api,online=true){const c=vm.createContext({api,navigator:{onLine:online},setTimeout:f=>f(),Error});vm.runInContext(code,c);return c;}
test('read waits longer than upstream deadline and recovers once from transient failure',async()=>{
 let calls=0;const c=harness(async(path,b,timeout)=>{assert.equal(timeout,55000);assert.equal(path,'/api/sa2-app');calls++;if(calls===1)throw Error('app_unavailable');return {ok:true};});
 assert.equal((await c.readApp({action:'core'})).ok,true);assert.equal(calls,2);
});
test('read retry is bounded and auth/invalid/offline failures never retry',async()=>{
 for(const [error,online,maxCalls] of [[Error('app_unavailable'),true,2],[Object.assign(Error('activation_required'),{status:401}),true,1],[Error('invalid_response'),true,1],[Error('app_unavailable'),false,1]]){
 let calls=0;const c=harness(async()=>{calls++;throw error;},online);await assert.rejects(c.readApp({action:'plans'}));assert.equal(calls,maxCalls);
 }
});
test('edit cannot enter retry helper and appCall dispatches writes directly once',async()=>{
 let calls=0;const c=harness(async()=>{calls++;return {};});await assert.rejects(c.readApp({action:'edit'}),/read_action_required/);assert.equal(calls,0);
 const app=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
 const line=app.match(/const appCall=[^\n]+/)[0];let reads=0,writes=0;
 const d=vm.createContext({readApp:async()=>reads++,api:async()=>writes++});vm.runInContext(line+';this.call=appCall;',d);
 await d.call({action:'edit'});await d.call({action:'plans'});assert.equal(reads,1);assert.equal(writes,1);
});
test('HTML gateway timeouts keep their status and recover once; malformed success never retries',async()=>{
 const apiCode=mobile.slice(mobile.indexOf('async function api('),mobile.indexOf('function coreProcessFromState('));
 for(const status of [504,502,200,401]){
  let calls=0;
  const c=vm.createContext({AbortController,Error,navigator:{onLine:true},setTimeout:(f,ms)=>{if(ms===1500)f();return 1;},clearTimeout(){},fetch:async()=>{
   calls++;return calls===1?{ok:status===200,status,json:async()=>{throw Error('HTML');}}:{ok:true,status:200,json:async()=>({ok:true})};
  }});
  vm.runInContext(apiCode,c);
  if([504,502].includes(status)){assert.equal((await c.readApp({action:'core'})).ok,true);assert.equal(calls,2);}
  else{await assert.rejects(c.readApp({action:'core'}));assert.equal(calls,1);}
 }
});
