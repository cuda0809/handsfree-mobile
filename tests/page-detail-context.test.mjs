import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
const c=vm.createContext({esc:v=>String(v||''),currentStatusLabel:x=>x.state,heading:(...x)=>x.join(' · '),formatHfDate:v=>v||'미정',planStagesOnDay:()=>['프로그램'],HfProductionRules:{today:()=> '2026-10-07'},displayedNextAction:x=>x.nextAction,strictCurrentStageIndex:()=>3,finishingPlan:()=>({label:'2026-10-08 ~ 2026-10-09 · 자동 계획'})});
vm.runInContext(src.slice(src.indexOf('function pageDetailHtml('),src.indexOf('async function openProject(')),c);
const row={orderId:'FIXTURE',customer:'고객',model:'장비',state:'프로그램 완료',currentIssue:'부품 대기',nextAction:'입고 확인',recentEvent:'전장 완료',planProgram:'2026-10-07',planInspection:'2026-10-14',planTimeline:[]};
test('today detail contains context only, no input or full project lifecycle',()=>{
 const before=JSON.stringify(row),html=c.pageDetailHtml(row,'today');
 for(const text of ['현재 상태','현재 이슈','오늘 계획','다음 행동','최근 입력','부품 대기'])assert.ok(html.includes(text));
 assert.doesNotMatch(html,/textarea|<input|onclick|전체 라이프사이클|전체 제작 일정/);
 assert.equal(JSON.stringify(row),before);
});
test('plan detail keeps schedule separate from issues and uses existing automatic finishing',()=>{
 const html=c.pageDetailHtml(row,'plan');assert.match(html,/2026-10-08 ~ 2026-10-09 · 자동 계획/);assert.match(html,/2026-10-14/);assert.match(html,/프로그램 · 현재/);assert.doesNotMatch(html,/부품 대기|최근 입력|textarea/);
});
test('context actions retain exact job and reuse schedule editor without writes',()=>{
 const controls={contextProjectLink:{},contextScheduleEdit:{}},calls=[];
 Object.assign(c,{operationalRows:()=>[row],projectDetailRow:()=>row,readStale:false,open:html=>calls.push(['open',html]),$:id=>controls[id],openProject:(...args)=>calls.push(['project',...args]),scheduleReport:x=>calls.push(['schedule',x]),toast:()=>{throw Error('unexpected');}});
 c.openPageDetail(row.orderId,'plan',row);controls.contextScheduleEdit.onclick();assert.equal(calls.at(-1)[1],row);
 controls.contextProjectLink.onclick();assert.deepEqual(calls.at(-1).slice(0,3),['project','FIXTURE','detail']);
 c.openPageDetail(row.orderId,'today',row);assert.doesNotMatch(calls.at(-1)[1],/contextScheduleEdit|textarea/);
});
