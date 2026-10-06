import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const today='2026-10-06';
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
