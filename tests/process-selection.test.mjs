import fs from 'node:fs';import vm from 'node:vm';import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/issue-context.js');
const flow=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
test('all seven real processes and four statuses round trip explicit choices',()=>{
 for(const stage of rules.stages)for(const status of rules.statuses){const choice=rules.selection(stage,status);const result=rules.resolve('현장 작업 기록\n[공정 확인] '+choice,{state:'검수 진행'});assert.equal(result.state,choice);assert.equal(result.explicitDecision,true);assert.equal(result.changesState,true);assert.equal(result.status,choice==='출고 완료'?'CLOSED':'OPEN');}
 assert.equal(rules.selection('가짜공정','완료'),'');assert.equal(rules.selection('조립',''),'');
});
test('dated delivery stays ambiguous until the user confirms shipment and completion',()=>{
 const raw='10/28 납품 완료';assert.equal(rules.resolve(raw,{state:'검수 진행'}).needsDecision,true);
 const result=rules.resolve(raw+'\n[공정 확인] 출고 완료',{state:'검수 진행'});assert.equal(result.state,'출고 완료');assert.equal(result.type,'DELIVERY');assert.equal(result.status,'CLOSED');
 for(const raw of ['내일 납품 예정','검수 완료 후 납품 예정','부품 입고 완료'])assert.notEqual(rules.resolve(raw,{state:'조립 진행'}).status,'CLOSED');
});
function harness({text='10/28 납품 완료',choice='출고 완료',incomplete=false}={}){
 let saved=[],outbound,calls=0;const p={orderId:'260727A-060-02',customer:'고객',model:'장비',state:'검수 진행'};
 const c=vm.createContext({todayIssueTarget:()=>p,unresolvedSameInput:()=>null,navigator:{onLine:true},classifyUnifiedEvent:(v,x)=>rules.resolve(v,x),issueDecision:()=>choice,issueDecisionIncomplete:()=>incomplete,resolveUnifiedImpact:(x,d)=>({...d,effectiveState:d.state||x.state}),crypto:{randomUUID:()=> 'fixture-submission-12345'},notes:()=>saved,persist:(k,v)=>saved=v,KEY:'notes',api:async(path,b)=>{calls++;outbound=b;return {applied:true,status:'WRITTEN',requestId:'FIXTURE'};},projectHistoryCache:new Map(),updateNote:(id,p)=>Object.assign(saved.find(n=>n.id===id),p),setTimeout(){},Date});
 const start=flow.indexOf('async function submitUnifiedEvent(');vm.runInContext(flow.slice(start,flow.indexOf('let todayIssueOpenId',start)),c);
 return {c,run:()=>c.submitUnifiedEvent(p.orderId,text,{}),get:()=>({saved,outbound,calls})};
}
test('actual submission preserves original date/raw/job and carries the separate manual state',async()=>{
 for(const [text,choice] of [['10/28 납품 완료','출고 완료'],['조립 완료','전장 대기']]){const h=harness({text,choice});const result=await h.run(),{saved,outbound}=h.get();assert.equal(result.ok,true);assert.equal(saved[0].originalText,text);assert.match(outbound.text,new RegExp('\\[공정 확인\\] '+choice));assert.ok(outbound.text.includes(text));assert.equal(saved[0].displayState,choice);assert.equal(saved[0].status,'saved_unverified');}
});
test('incomplete or missing explicit choices cannot fall through to an inferred write',async()=>{
 for(const config of [{choice:''},{text:'조립 완료',choice:'',incomplete:true}]){const h=harness(config);assert.equal((await h.run()).error,'decision_required');assert.equal(h.get().calls,0);assert.equal(h.get().saved.length,0);}
});
test('the current GAS delivery projection recognizes the dated shipment without changing the backend',()=>{
 const src=fs.readFileSync('apps-script/HF_LIGHT_APP.gs','utf8'),c=vm.createContext({Date});const start=src.indexOf('function hfAppDeliveryDay_');vm.runInContext(src.slice(start,src.indexOf('function hfAppPlanOverview_',start)),c);
 const job='260727A-060-02',raw=job+' 10/28 납품 완료',r=Array(23).fill('');Object.assign(r,{0:'FIXTURE-E01',3:raw,6:'2026-10-28',7:'출고완료',14:'확정',17:'WRITTEN',20:job});const p={orderId:job,team:'B',state:'검수 진행',qty:1};const before=JSON.stringify([p,r]);const out=c.hfAppDeliveryEvidence_([p],[r],[],'2026-10-30')[0];assert.equal(out.actualDelivery,'2026-10-28');assert.equal(out.actualDeliveryReview,'');assert.equal(JSON.stringify([p,r]),before);
});
test('shipment readback requires exact server evidence and cannot close issues through a generic edit',async()=>{
 for(const evidence of ['match','other','conflict','none']){
  const p={projectId:'p',orderId:'job',state:'검수 진행',contentEvidence:{requestId:'REQ'},actualDelivery:evidence==='none'?'':'2026-10-28',actualDeliveryReview:evidence==='conflict'?'충돌':'',actualDeliveryEvidence:[{source:'Event',sourceRef:'HF_DATA_입력정규화!2 · '+(evidence==='other'?'OTHER':'REQ')+'-E01'}]};
  const c=vm.createContext({items:[{...p}],coreReadGeneration:0,projectHistoryCache:new Map(),coreCacheSave(){},renderCoreScreen(){},appCall:async()=>({ok:true,projects:[p]})});
  const start=flow.indexOf('async function readBackSubmittedProject(');vm.runInContext(flow.slice(start,flow.indexOf('async function verifyEventNote(',start)),c);
  const promise=c.readBackSubmittedProject({orderId:'job',displayState:'출고 완료',stateSyncVersion:'natural-v3',eventType:'DELIVERY'},'REQ');
  if(evidence==='match')await promise;else await assert.rejects(promise,/state_readback_unconfirmed/);
 }
 assert.match(flow,/classification.type!=='DELIVERY'\)await syncUnifiedStateBackground/);
});
