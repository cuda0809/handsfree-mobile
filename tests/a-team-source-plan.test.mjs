import test from 'node:test';import assert from 'node:assert/strict';import {prepareAPlan} from '../lib/a-team-source-plan.mjs';
function fixture(){
 const rows=Array.from({length:7},()=>Array(37).fill(''));
 for(let d=1;d<=31;d++){rows[2][d+5]=`10/${d}`;rows[3][d+5]='일월화수목금토'[new Date(Date.UTC(2026,9,d)).getUTCDay()];}
 Object.assign(rows[4],{0:'A',2:'260319A-020',4:'자재입고',6:'1'});Object.assign(rows[5],{4:'생산조립',6:'1'});Object.assign(rows[6],{4:'전장/납품',7:'TEST',36:'10/23'});
 return {sourceValues:rows,coreRows:[['P1','260319A-020','A','고객','모델','1','2026-10-31','담당']],sourceStartRow:853,month:'2026-10',revision:'20261016',firstGroupIndex:4,groupCount:1};
}
test('source markers produce plans only, leave ambiguous dates for review and preserve raw input',()=>{
 const f=fixture(),before=JSON.stringify(f),r=prepareAPlan(f);assert.equal(r.records.length,3);assert.equal(r.review[0].raw,'10/23');
 assert.ok(r.records.every(x=>x[11]==='계획'&&x[14].includes('실적 아님')));assert.equal(r.records[2][3],'2026-10-02');assert.equal(JSON.stringify(f),before);
});
test('source calendar, process layout and exact team identity must match before preparation',()=>{
 const f=fixture();f.sourceValues[2][6]='9/1';assert.throws(()=>prepareAPlan(f),/calendar/);
 const g=fixture();g.coreRows[0][2]='B';assert.throws(()=>prepareAPlan(g),/identity/);
 const h=fixture();h.sourceValues[5][4]='납품';assert.throws(()=>prepareAPlan(h),/process_rows/);
});
