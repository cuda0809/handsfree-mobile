import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const today='2026-10-06';
test('classification distinguishes actual work, plans, storage, overdue and actual shipment',()=>{
 const examples=[
  [{state:'조립 진행'},'진행 중'],
  [{state:'자재 입고 대기',planTimeline:[{date:'2026-10-12',process:'조립'}]},'작업 예정'],
  [{state:'출고대기',planTimeline:[{date:'2026-09-03',process:'납품'}]},'출고대기'],
  [{state:'1대분 보관중'},'출고대기'],
  [{state:'조립 예정',planTimeline:[{date:'2026-10-01',process:'조립'}]},'확인 필요'],
  [{state:'설계 진행 중',due:'2026-12-30'},'확인 필요'],
  [{state:'검수 완료',masterState:'완료'},'확인 필요'],
  [{state:'출고완료',actualDelivery:'26/ 8/ 30'},'출고완료'],
  [{state:'자재 입고 대기',actualDelivery:'invalid'},'확인 필요']
 ];
 for(const [x,expected] of examples){const before=JSON.stringify(x);assert.equal(rules.classify(x,today),expected);assert.equal(JSON.stringify(x),before);}
});
test('source-verified monthly snapshot supersedes obsolete same-month rows and keeps history',()=>{
 const records=[
  {recordId:'old',date:'2026-10-06',sourceMonth:'2026-10',process:'조립'},
  {recordId:'BVERIFIED|20261006T120000Z|JOB|202610|META',date:'2026-10-01',sourceMonth:'2026-10',process:'',status:'작업 예정',sourceRef:'생산B팀!C1459'},
  {recordId:'BVERIFIED|20261006T120000Z|JOB|20261012|조립',date:'2026-10-12',sourceMonth:'2026-10',process:'조립',status:'계획',sourceRef:'생산B팀!R1460'},
  {recordId:'older',date:'2026-09-10',sourceMonth:'2026-09',process:'조립'},
  {recordId:'late-collector',date:'2026-10-06',sourceMonth:'2026-10',process:'조립'}
 ];
 const resolved=rules.resolve(records);assert.equal(resolved.planAssembly,'2026-10-12');assert.equal(resolved.planTimeline.length,1);
 assert.equal(resolved.planHistory.length,4);assert.equal(resolved.planSourceVerified,true);
 assert.equal(rules.resolve([records[1]]).planTimeline.length,0);
 assert.equal(rules.resolve([records[0],records[3]]).planTimeline.length,1);
 assert.throws(()=>rules.resolve([{...records[1],status:undefined}]),/plan_provenance_not_supported/);
 const newer={...records[1],recordId:'BVERIFIED|20261007T120000Z|JOB|202610|META'};
 assert.equal(rules.resolve([...records,newer]).planTimeline.length,0);
});
test('blank and invalid dates never establish completed production',()=>{
 for(const v of ['',null,'미정','2026-99-99','2026-02-30'])assert.equal(rules.day(v),'');
 assert.equal(rules.day('46307'),'2026-10-12');
});
