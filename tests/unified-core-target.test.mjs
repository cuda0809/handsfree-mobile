import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('apps-script/HF_REAL_SAFE_WRITE_V08.gs','utf8');
const header=['Project_ID','JOB_NO','생산팀','고객사','모델'];
const job='260626A-045';
const record=['PRJ-00137',job,'A','카본티엔씨','KNH - 200 (고압분산기)'];
function fixture(rows=[record], options={}) {
 const c=vm.createContext({Date, Utilities:{formatDate:()=> '2026-10-16'}});
 vm.runInContext(source,c);
 let legacyReads=0;
 const ss={getSheetByName(name){
  if(name==='HF_CORE_통합운영')return options.missing?null:{getSheetId:()=>options.id??1301394609,getLastRow:()=>rows.length+1,getRange:()=>({getDisplayValues:()=>[options.header??header,...rows]})};
  if(name==='제품마스터'){legacyReads++;return {getLastRow:()=>5,getRange:()=>({getDisplayValues:()=>[['260727A-060-02','기존 B고객','KRM-50B']]})};}
  return {getSheetId:()=>1907002001,getLastRow:()=>1,getRange:()=>({getDisplayValues:()=>[['Excluded Actual Date','2026-09-14']]})};
 }};
 return {c,ss,legacyReads:()=>legacyReads};
}
const payload={channel:'MOBILE|UNIFIED_EVENT|SA2:사용자',targetHint:job+' · 카본티엔씨 · KNH-200'};
test('actual A45 submission classifies against canonical Core without legacy reads or writes',()=>{
 const {c,ss,legacyReads}=fixture();
 const e=c.normalEvent_(ss,job+' · 카본티엔씨 · KNH - 200 (고압분산기) 테스트',1,payload);
 assert.equal(e.orderId,job);assert.equal(e.customer,'카본티엔씨');assert.equal(e.safe,true);assert.match(e.work,/테스트$/);assert.equal(e.type,'일일작업');assert.equal(legacyReads(),0);
 assert.equal('state' in e,false,'test text must not invent completion');
});
test('B exact jobs and multiline continuations preserve selected target',()=>{
 const b=['PRJ-B','260727A-060-02','B','B고객','KRM-50B'];
 const {c,ss}=fixture([b]);
 const e=c.resolveUnifiedProject_(ss,'10/21 가공품 입고 대기',{...payload,targetHint:b[1]});
 assert.equal(e.orderId,b[1]);assert.equal(e.ambiguous,false);
});
test('unknown, duplicate, cross-team, incomplete and malformed Core all fail closed',()=>{
 for(const [rows,opts] of [[[],{}],[[record,record],{}],[[[...record.slice(0,2),'C',...record.slice(3)]],{}],[[['',...record.slice(1)]],{}],[[record],{missing:true}],[[record],{id:1}],[[record],{header:['wrong']}]] ){
  const {c,ss,legacyReads}=fixture(rows,opts);
  assert.equal(c.resolveUnifiedProject_(ss,'테스트',payload).ambiguous,true);assert.equal(legacyReads(),0);
 }
});
test('conflicting explicit jobs and multiple selected jobs are never silently resolved',()=>{
 const {c,ss}=fixture();
 assert.equal(c.resolveUnifiedProject_(ss,'260727A-060-02 전장 완료',payload).ambiguous,true);
 assert.equal(c.resolveUnifiedProject_(ss,'테스트',{...payload,targetHint:job+' 260727A-060-02'}).ambiguous,true);
});
test('legacy field input and explicit general lane preserve existing behavior',()=>{
 const {c,ss,legacyReads}=fixture();
 assert.equal(c.resolveUnifiedProject_(ss,'260727A-060-02',{}).orderId,'260727A-060-02');assert.equal(legacyReads(),1);
 const e=c.normalEvent_(ss,'일반 지원 업무',1,{channel:'MOBILE|GENERAL_EVENT',targetHint:'GENERAL_ISSUE',requester:'사용자'});
 assert.equal(e.general,true);assert.equal(e.orderId,'');assert.equal(e.safe,true);assert.equal(legacyReads(),1);
});
