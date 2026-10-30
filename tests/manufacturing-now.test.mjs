import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const today='2026-10-06';
test('source-verified actual work includes Cosmos materials label and completed electrical follow-up',()=>{
 const evidence={recordId:'BVERIFIED|20261006T095639Z|JOB|META',status:'진행 중',sourceMonth:'2026-10',date:'2026-10-01',sourceRef:'원본 대조 확정 · 실제 진행 근거: 생산B팀!R1542 (#10/5~10/9)'};
 for(const state of ['생산팀 조립자재 수령중','전장 완료']){
  const x={state,planSourceVerified:true,productionEvidence:evidence};
  assert.equal(rules.manufacturingNow(x,today),true);
  assert.equal(rules.manufacturingNow({...x,planSourceVerified:false},today),false);
  for(const patch of [{sourceRef:'일정만 존재'},{sourceMonth:'2026-09'},{date:'2026-10-12'},{recordId:'unverified'}])
   assert.equal(rules.manufacturingNow({...x,productionEvidence:{...evidence,...patch}},today),false);
 }
 for(const state of ['출고완료','출고대기','제작 종료','작업 중단','작업 취소'])
  assert.equal(rules.manufacturingNow({state,planSourceVerified:true,productionEvidence:evidence},today),false);
});
test('today issues require actual fabrication evidence rather than broad active or plan labels',()=>{
 for(const x of [
  {state:'납품 전 마무리 작업 중'},
  {state:'생산팀 조립자재 수령중',productionEvidence:{status:'진행 중'}},
  {state:'생산팀 조립자재 수령중',recentEvent:'베셀 10/8 입고예정',productionEvidence:{status:'진행 중'}},
  {state:'설계 진행 중'}, {state:'조립 진행 예정'}, {state:'조립 진행 아님'},
  {state:'출고대기',recentEvent:'조립진행'}, {state:'출고완료',currentIssue:'조립진행중'},
  {state:'연구소 테스트 진행',productionEvidence:{status:'확인 필요'}},
  {state:'조립 예정',planTimeline:[{date:today,process:'조립'}]}
 ])assert.equal(rules.manufacturingNow(x,today),false,JSON.stringify(x));
 for(const x of [
  {state:'1차 조립 진행 중'}, {state:'전장 작업 중'}, {state:'마감조립 진행'},
  {state:'생산팀 조립자재 수령중',recentEvent:'· · 조립진행'},
  {state:'생산팀 조립자재 수령중',currentIssue:'개선품 입고대기\n조립가능 파트 조립진행'},
  {orderId:'25-ONGOING',state:'조립 진행'}
 ])assert.equal(rules.manufacturingNow(x,today),true,JSON.stringify(x));
});
