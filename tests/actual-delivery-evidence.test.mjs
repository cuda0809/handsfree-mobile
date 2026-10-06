import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('apps-script/HF_LIGHT_APP.gs','utf8');
const ctx=vm.createContext({});vm.runInContext(src.slice(src.indexOf('function hfAppDeliveryDay_'),src.indexOf('function hfAppPlanOverview_')),ctx);
const job='260727A-060-01';
const project={projectId:'PRJ-1',orderId:job,team:'B',actualDelivery:'',state:'조립 진행',nextAction:'사용자 입력 유지'};
function event(raw,patch={}){const r=Array(23).fill('');r[0]='E-1';r[1]='2026-10-06 19:29:48';r[3]=job+' '+raw;r[6]='2026-10-01';r[14]='확정';r[17]='WRITTEN';r[20]=job;for(const [k,v]of Object.entries(patch))r[k]=v;return r;}
const run=(p,ev,j=[])=>ctx.hfAppDeliveryEvidence_([p],ev,j,'2026-10-06')[0];
test('explicit dated completion projects shipment day, not received date; preserves raw/state',()=>{
 for(const raw of ['출고완료 10/1','10월 1일 출고 완료','납품완료 2026-10-01']){
  const e=event(raw),before=JSON.stringify([project,e]);const p=run(project,[e]);assert.equal(p.actualDelivery,'2026-10-01');assert.equal(p.state,project.state);assert.equal(p.nextAction,project.nextAction);assert.equal(p.actualDeliveryEvidence[0].source,'Event');assert.equal(JSON.stringify([project,e]),before);
 }
});
test('plans, unresolved targets, partial shipment, failed events and undated messages cannot create actual dates',()=>{
 for(const raw of ['출고완료','10/1 출고완료 예정','10/1 출고완료 아님','10/1 출고대기','10/1 외주 출고완료','10/1 부분 출고완료','10/1 출고완료 취소','10/1 재출고 완료','2026-02-30 출고완료','10/8 출고완료','260727A-060-02 출고완료 10/1','260727A-060-* 출고완료 10/1'])assert.equal(run(project,[event(raw)]).actualDelivery,'',raw);
 for(const patch of [{17:'EXCLUDED'},{17:'REVIEW'},{14:'검토'},{6:'2026-09-14'}])assert.equal(run(project,[event('출고완료 10/1',patch)]).actualDelivery,'');
 assert.equal(run({...project,qty:'2'},[event('1대 출고완료 10/1')]).actualDelivery,'');
});
test('conflicts and current shipping-wait require review; existing dates stay authoritative',()=>{
 assert.equal(run({...project,actualDelivery:'26/ 9/ 30'},[event('출고완료 10/1')]).actualDelivery,'2026-09-30');
 assert.match(run({...project,actualDelivery:'2026-09-30'},[event('출고완료 10/1')]).actualDeliveryReview,/충돌/);
 const p=run(project,[event('출고완료 10/1'),event('출고완료 10/2')]);assert.equal(p.actualDelivery,'');assert.match(p.actualDeliveryReview,/충돌/);
 const wait=run({...project,state:'출고대기'},[event('출고완료 10/1')]);assert.equal(wait.actualDelivery,'');assert.match(wait.actualDeliveryReview,/충돌/);
 const canceled=run(project,[event('출고완료 10/1'),event('출고완료 취소')]);assert.equal(canceled.actualDelivery,'');assert.match(canceled.actualDeliveryReview,/취소/);
 assert.equal(run({...project,team:'A'},[event('출고완료 10/1')]).actualDelivery,'');
 assert.equal(run(project,[event('출고완료 10/1',{7:'기타',15:'',20:''})]).actualDelivery,'','general journal cannot imply equipment shipment');
});
test('confirmed journal business date is accepted only with exact job; auto-stamped event mirrors are excluded',()=>{
 const row=['2026-10-01','출고완료','고객','모델','출고완료','',job+' 납품','일지','확정'];
 assert.equal(run(project,[],[row]).actualDelivery,'2026-10-01');
 assert.equal(run(project,[],[[...row.slice(0,7),'현장입력','확정']]).actualDelivery,'');
 const noJob=row.slice();noJob[6]='고객 납품';assert.equal(run(project,[],[noJob]).actualDelivery,'');
});
