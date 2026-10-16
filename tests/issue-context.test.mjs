import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {resolve}=createRequire(import.meta.url)('../kmt-sa2/issue-context.js');
test('mixed parts receipts do not imply equipment completion; active work wins over an earlier completed process',()=>{
 const d=resolve('베셀입고 완료 /리크테스트 진행중/암 수정품 입고완료',{state:'마감조립 진행'});assert.equal(d.state,'테스트 진행');assert.equal(d.needsDecision,false);
 assert.equal(resolve('조립 완료; 전장 진행',{state:'조립 진행'}).state,'전장 진행');
});
test('uncertain, conflicting and regressive work offers immediate explicit decisions',()=>{
 for(const raw of ['전장 완료 여부 확인 필요','조립 진행; 전장 진행','조립 진행']){const d=resolve(raw,{state:'전장 완료',planTimeline:[{process:'전장'}]});assert.equal(d.needsDecision,true);assert.ok(d.candidates.length);}
 const d=resolve('전장 완료 여부 확인 필요',{state:'전장 진행'});assert.ok(d.candidates.includes('전장 완료'));
 assert.equal(resolve('조립 진행\n[공정 확인] 조립 진행',{state:'검수 진행'}).explicitDecision,true);
 assert.equal(resolve('전장 완료\n[공정 확인] 상태 유지',{state:'조립 진행'}).changesState,false);
});
test('plans and part completion never fabricate actual completion',()=>{
 for(const raw of ['전장 완료 예정','내일 전장 시작','전장 완료 후 검수 진행','베셀 입고 완료'])assert.equal(resolve(raw,{state:'조립 진행'}).changesState,false);
});
