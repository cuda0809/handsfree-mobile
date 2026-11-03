import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const flow=fs.readFileSync('kmt-sa2/app-flow.js','utf8'),mobile=fs.readFileSync('kmt-sa2/mobile.js','utf8');
test('complete saved counts remain visible during refresh, auth or missing snapshot cannot produce numbers',()=>{
 const c=vm.createContext({lastReadErrorStatus:0,coreSnapshot:true,readStale:true,planReadStale:true,planOverviewCache:()=>({completePlan:true})});
 vm.runInContext(flow.slice(flow.indexOf('function planCountLabel('),flow.indexOf('function productionPlanRows(')),c);
 assert.equal(c.planCountLabel(0),'0대 · 최근 확인');assert.equal(c.planCountLabel(12),'12대 · 최근 확인');c.lastReadErrorStatus=401;assert.equal(c.planCountLabel(12),'확인 불가');c.lastReadErrorStatus=0;c.coreSnapshot=false;assert.equal(c.planCountLabel(12),'확인 불가');
 c.coreSnapshot=true;c.planOverviewCache=()=>null;assert.equal(c.planCountLabel(12),'확인 불가');assert.equal(c.planCountLabel(12,false),'12대 · 최근 확인');
});
test('overview read timeout is bounded and never immediately retried',async()=>{
 let calls=0;const c=vm.createContext({navigator:{onLine:true},api:async(path,body,timeout)=>{calls++;assert.equal(timeout,55000);throw Object.assign(Error('app_unavailable'),{status:503});}});
 vm.runInContext(mobile.slice(mobile.indexOf('async function readApp('),mobile.indexOf('function coreProcessFromState(')),c);
 for(const action of ['core','catalog','plans'])await assert.rejects(c.readApp({action}));assert.equal(calls,3);
});
