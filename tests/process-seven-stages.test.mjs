import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const source=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
const code=source.slice(source.indexOf('const HYBRID_FLOW_STAGES='),source.indexOf('const PLAN_OVERVIEW_KEY='));
const ctx=vm.createContext({norm:v=>String(v||'').replace(/\s/g,'')});
vm.runInContext(code,ctx);
test('current stage distinguishes program and finishing without treating next action as current',()=>{
 for(const [state,expected] of [['전장 완료',2],['프로그램 진행',3],['마감 조립 진행',4],['검수 진행',5],['출고완료',6]])
  assert.equal(ctx.strictCurrentStageIndex({state}),expected);
 assert.equal(ctx.hybridStageIndex({state:'전장 완료',nextAction:'프로그램 2026-10-07'}),2);
 const html=ctx.hybridStageFlow({state:'마감조립 진행'});
 assert.equal((html.match(/class="hybrid-stage /g)||[]).length,7);
 assert.match(html,/class="hybrid-stage now"><i><\/i><b>마감조립/);
});
test('separate planned dates, absent finishing remains unknown, next action follows finishing',()=>{
 const rows=[['조립','01'],['전장','06'],['프로그램','07'],['마감조립','09'],['검수','14'],['출고','26']].map(([process,d])=>({process,date:'2026-10-'+d,sourceMonth:'2026-10'}));
 const p=rules.resolve(rows);
 assert.equal(p.planElectrical,'2026-10-06');assert.equal(p.planProgram,'2026-10-07');assert.equal(p.planFinishing,'2026-10-09');
 assert.equal(rules.resolve(rows.filter(r=>r.process!=='마감조립')).planFinishing,'');
 assert.equal(rules.resolve(rows.filter(r=>r.process==='마감조립')).planAssembly,'');
 assert.match(rules.nextAction({...p,state:'프로그램 완료',planSourceVerified:true},'2026-10-07'),/^마감조립/);
 assert.match(rules.nextAction({...p,state:'마감조립 완료',planSourceVerified:true},'2026-10-07'),/^검수/);
});
test('actual project renderer shows seven plans with electrical and program dates separate',()=>{
 const row={orderId:'FIXTURE',team:'B',customer:'검증 장비',model:'TEST',state:'전장 완료',since:'2026-10-07',planElectrical:'2026-10-06',planProgram:'2026-10-07',planTimeline:[]};
 const el={isConnected:true,innerHTML:'',insertAdjacentHTML(){}};
 const c=vm.createContext({linked:row,p:row,el,shownHistory:null,historyState:'검증',norm:v=>String(v||'').replace(/\s/g,''),projectDetailRow:()=>row,
 formatHfDate:v=>v||'미정',isCompletedOperational:()=>false,appDay:v=>v||'',projectPlanStageMap:()=>new Map(),esc:v=>String(v||''),productionClass:()=> '진행 중',
 projectCurrentFields:()=>'',lifecyclePreview:()=>'',projectLifecycle(){},projectHistory(){},openProjectPlan(){},input(){},$:()=>({})});
 vm.runInContext(code,c);
 vm.runInContext(source.slice(source.indexOf('function finishingPlan('),source.indexOf('function planStagesOnDay(')),c);
 vm.runInContext(source.slice(source.indexOf('function currentStatusLabel('),source.indexOf('function projectCurrentFields(')),c);
 const start=source.indexOf(' const render=()=>{',source.indexOf('async function openProject('));
 const end=source.indexOf('\n render();',start);
 vm.runInContext(source.slice(start,end)+'\nrender();',c);
 assert.equal((el.innerHTML.match(/class="hybrid-step /g)||[]).length,7);
 assert.match(el.innerHTML,/<b>전장<\/b><small>완료 · 계획 2026-10-06/);
 assert.match(el.innerHTML,/<b>프로그램<\/b><small>계획 2026-10-07/);
 assert.match(el.innerHTML,/<b>마감조립<\/b><small>계획 선행 일정 확인 필요/);
});
