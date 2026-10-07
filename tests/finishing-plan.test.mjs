import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
const ctx=vm.createContext({formatHfDate:v=>String(v||'미정')});
vm.runInContext(source.slice(source.indexOf('function finishingPlan('),source.indexOf('function dueUrgency(')),ctx);
test('automatic finishing uses weekdays only and one or two days before inspection',()=>{
 for(const [program,inspection,expected] of [
 ['2026-10-08','2026-10-13',['2026-10-09','2026-10-12']],
 ['2026-10-09','2026-10-13',['2026-10-12']],
 ['2026-10-09','2026-10-12',[]],
 ['2026-12-31','2027-01-05',['2027-01-01','2027-01-04']],
 ['2026-10-09','2026-10-08',[]]]){
 const x={planProgram:program,planInspection:inspection,state:'전장 완료'};const before=JSON.stringify(x);
 const result=ctx.finishingPlan(x);assert.deepEqual(Array.from(result.days),expected);assert.equal(JSON.stringify(x),before);
 if(!expected.length)assert.equal(result.label,'일정 조정 필요');
 }
});
test('manual plan wins; missing dates remain explicit; changes recalculate',()=>{
 const x={planProgram:'2026-10-09',planInspection:'2026-10-14',planFinishing:'2026-10-13'};
 assert.equal(ctx.finishingPlan(x).automatic,false);assert.equal(ctx.finishingPlan(x).start,'2026-10-13');
 delete x.planFinishing;assert.equal(ctx.finishingPlan(x).days.length,2);
 x.planInspection='2026-10-13';assert.equal(ctx.finishingPlan(x).days.length,1);
 delete x.planInspection;assert.equal(ctx.finishingPlan(x).label,'선행 일정 확인 필요');
});
test('multi-day source uses program end and inspection start; today includes derived finishing',()=>{
 const x={planTimeline:[{date:'2026-10-07',process:'프로그램'},{date:'2026-10-09',process:'프로그램'},{date:'2026-10-14',process:'검수'},{date:'2026-10-15',process:'검수'}]};
 assert.equal(ctx.finishingPlan(x).start,'2026-10-12');assert.equal(ctx.finishingPlan(x).end,'2026-10-13');
 assert.deepEqual(Array.from(ctx.planStagesOnDay(x,'2026-10-12')),['마감조립']);
 assert.deepEqual(Array.from(ctx.planStagesOnDay(x,'2026-10-10')),[]);
});
