import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const server=fs.readFileSync('apps-script/HF_LIGHT_APP.gs','utf8');
const flow=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
const ctx=vm.createContext({norm:v=>String(v||'').replace(/\s/g,'')});
vm.runInContext(server.slice(server.indexOf('function hfAppCurrentEvidence_'),server.indexOf('function hfAppDeliveryEvidence_')),ctx);
vm.runInContext(flow.slice(flow.indexOf('function currentStatusLabel('),flow.indexOf('function projectCurrentFields(')),ctx);
vm.runInContext(flow.slice(flow.indexOf('const HYBRID_FLOW_STAGES='),flow.indexOf('const PLAN_OVERVIEW_KEY=')),ctx);
vm.runInContext(flow.slice(flow.indexOf('function naturalProcess('),flow.indexOf('function todayIssueTarget(')),ctx);
const job='260714A-054';
function event(text,date,stamp,type='일일작업',id=stamp){
 const r=Array(23).fill('');Object.assign(r,{0:id+'-E01',1:stamp,2:'FIELD_INPUT',3:job+' '+text,6:date,7:type,10:text,15:job,17:'WRITTEN',20:job,22:id});return r;
}
test('assembly work, unresolved future inbound and latest work agree across status and graph',()=>{
 const base={orderId:job,team:'B',state:'생산팀 조립자재 수령중',process:'조립',recentEvent:'베셀 10/8 입고예정',recentEventAt:'2026-10-03 19:50:43 KST',currentIssue:'이전 반출'};
 const rows=[event('조립 가능파트 조립 진행','2026-10-01','2026-10-01 12:44:00 KST'),event('디스퍼 블레이드, 갭링 조립불가로 반출 10/8 입고예정','2026-10-08','2026-10-06 18:52:05 KST'),event('유압펌프 연결','2026-10-07','2026-10-07 14:30:37 KST')];
 const before=JSON.stringify([base,rows]);
 const p=ctx.hfAppCurrentEvidence_([base],rows,'2026-10-07')[0];
 assert.equal(p.state,'조립 진행');assert.match(p.currentIssue,/10\/8 입고예정/);assert.equal(p.recentEvent,'유압펌프 연결');
 assert.match(ctx.currentStatusLabel(p),/유압펌프 연결/);assert.match(ctx.currentStatusLabel(p),/갭링/);assert.equal(ctx.strictCurrentStageIndex(p),1);
 assert.equal(JSON.stringify([base,rows]),before);
});
test('future inbound issue does not erase electrical completion or become future actual work',()=>{
 const p=ctx.hfAppCurrentEvidence_([{orderId:job,team:'B',state:'조립 진행',process:'조립',currentIssue:''}],
 [event('전장 완료','2026-10-07','2026-10-07 10:35:41 KST'),event('가공품 입고대기 10/21','2026-10-21','2026-10-07 17:08:35 KST','지연사유')],'2026-10-07')[0];
 assert.equal(p.state,'전장 완료');assert.equal(ctx.strictCurrentStageIndex(p),2);assert.match(ctx.currentStatusLabel(p),/전장 완료.*입고대기 10\/21/);
});
test('notes cannot replace unresolved operational issue',()=>{
 const p=ctx.hfAppCurrentEvidence_([{orderId:job,team:'B',state:'조립 진행',currentIssue:'부품 입고대기'}],[event('단순 메모','2026-10-07','2026-10-07 20:00:00 KST')],'2026-10-07')[0];
 assert.equal(p.currentIssue,'부품 입고대기');assert.equal(p.recentEvent,'단순 메모');
});
test('space variants and seven stages share the same interpretation; waits do not regress stage',()=>{
 for(const [input,state] of [['전장 진행','전장 진행'],['마감조립 진행','마감조립 진행'],['프로그램 수정 대기','프로그램 수정대기']])assert.equal(ctx.classifyUnifiedEvent(input).state,state);
 const c=ctx.classifyUnifiedEvent('가공품 입고대기 10/21');
 assert.equal(ctx.resolveUnifiedImpact({state:'전장 완료'},c,'가공품 입고대기 10/21').effectiveState,'전장 완료');
 assert.equal(ctx.unifiedStageFromText('마감조립 진행'),4);
});
test('targeted readback accepts only the exact saved request and immutable project',async()=>{
 for(const valid of [false,true]){
  const p={orderId:job,projectId:'P1',state:'전장 완료',currentIssue:'입고대기',contentEvidence:{requestId:valid?'NEW':'OLD'}};
  let renders=0,saves=0;
  const c=vm.createContext({appCall:async()=>({ok:true,projects:[p]}),items:[{orderId:job,projectId:'P1'}],coreReadGeneration:0,projectHistoryCache:new Map(),coreCacheSave:()=>saves++,renderCoreScreen:()=>renders++});
  vm.runInContext(flow.slice(flow.indexOf('async function readBackSubmittedProject('),flow.indexOf('async function verifyEventNote(')),c);
  if(valid){assert.equal(await c.readBackSubmittedProject({orderId:job},'NEW'),true);assert.equal(c.items[0].currentIssue,'입고대기');assert.equal(c.coreReadGeneration,1);assert.equal(renders,1);assert.equal(saves,1);}
  else{await assert.rejects(c.readBackSubmittedProject({orderId:job},'NEW'));assert.equal(renders,0);assert.equal(c.coreReadGeneration,0);}
 }
});
test('multiline continuation keeps exact selected equipment and rejects conflicting identifiers',()=>{
 const source=fs.readFileSync('apps-script/HF_REAL_SAFE_WRITE_V08.gs','utf8');
 const c=vm.createContext({resolveProject_:(_,id)=>({orderId:id,ambiguous:false})});
 vm.runInContext(source.slice(source.indexOf('function resolveUnifiedProject_'),source.indexOf('function workType_')),c);
 const p={channel:'MOBILE|UNIFIED_EVENT',targetHint:job+' · 고객\n모델'};
 assert.equal(c.resolveUnifiedProject_(null,'10/8 입고예정',p).orderId,job);
 assert.equal(c.resolveUnifiedProject_(null,'260727A-060-02 전장 완료',p).ambiguous,true);
});
test('multiline saved progress and issue render once per distinct line',()=>{
 assert.equal(ctx.currentStatusLabel({state:'프로그램 완료',recentEvent:'프로그램 완료\n가공수정품 입고 대기 10/21',currentIssue:'가공수정품 입고 대기 10/21'}),'프로그램 완료 · 가공수정품 입고 대기 10/21');
});
test('durable acknowledgement releases editor while failed readback remains pending',async()=>{
 let notes=[],task,writes=0;
 const c=vm.createContext({navigator:{onLine:true},crypto:{randomUUID:()=> 'stable-request-id'},KEY:'notes',todayIssueTarget:()=>({orderId:'JOB'}),classifyUnifiedEvent:()=>({type:'NOTE',changesState:false}),resolveUnifiedImpact:()=>({label:'메모'}),notes:()=>notes,persist:(k,v)=>notes=v,updateNote:(id,p)=>Object.assign(notes.find(n=>n.id===id),p),projectHistoryCache:new Map(),api:async()=>{writes++;return {applied:true,status:'WRITTEN',requestId:'saved-request'};},setTimeout:f=>task=f,verifyEventNote:async()=>{throw Error('readback timeout');}});
 vm.runInContext(flow.slice(flow.indexOf('async function submitUnifiedEvent('),flow.indexOf('let todayIssueOpenId=')),c);
 const result=await c.submitUnifiedEvent('JOB','원문 보존');
 assert.equal(result.statePending,true);assert.equal(notes[0].status,'saved_unverified');
 await task();assert.equal(notes[0].status,'saved_unverified');assert.equal(notes[0].text,'원문 보존');assert.equal(notes[0].submissionId,'stable-request-id');assert.equal(writes,1);
});
test('priority uses current actionable evidence without changing source records',()=>{
 const c=vm.createContext({isCompletedOperational:x=>!!x.actualDelivery,formatHfDate:v=>v||'',HfProductionRules:{today:()=> '2026-10-07'},ymdTime:v=>Date.parse(v+'T00:00:00Z')});
 vm.runInContext(flow.slice(flow.indexOf('function priorityAssessment('),flow.indexOf('function priorityReasonHtml(')),c);
 const cases=[
 [{due:'2026-10-05',currentIssue:'세라믹 입고 지연으로 납기 협의'},2],
 [{due:'2026-10-27',state:'프로그램 완료',currentIssue:'가공수정품 입고 대기 10/21'},0],
 [{due:'2026-10-29',currentIssue:'베어링·갭링 입고 완료'},0],
 [{due:'2026-10-14',currentIssue:'부품 입고 대기 10/21'},1],
 [{due:'2026-10-29',currentIssue:'불량 해결 완료'},0],
 [{due:'2026-10-29',currentIssue:'불량 해결 완료\n다른 부품 조립불가'},1],
 [{due:'2026-10-05',state:'출고대기',currentIssue:'고객 요청으로 보관'},0],
 [{due:'2026-10-05',actualDelivery:'2026-10-06'},0]
 ];
 for(const [x,n] of cases){const before=JSON.stringify(x);assert.equal(c.priorityAssessment(x).reasons.length,n);assert.equal(JSON.stringify(x),before);}
 assert.match(flow,/projects\(\\'urgent\\'\).*우선 조치/);
 assert.match(flow,/filter==='urgent'\?x.priority===1/);
 assert.match(flow,/담당 PM:/);
});
