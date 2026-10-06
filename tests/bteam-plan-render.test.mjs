import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const source=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
const code=source.slice(source.indexOf('function productionPlanRows('),source.indexOf('function delivery('));
const fixture=[{orderId:'WORK',team:'B',state:'조립 진행',planTimeline:[]},{orderId:'NEXT',team:'B',state:'자재 대기',planTimeline:[{date:'2099-10-12',process:'조립'}]},
 {orderId:'WAIT',team:'B',state:'출고대기'},{orderId:'CHECK',team:'B',state:'설계 대기'},{orderId:'DONE',team:'B',state:'출고완료'}];
function render(stale){
 const main={innerHTML:'',querySelectorAll:()=>[]};
 const ctx=vm.createContext({main,Date,screen:'home',readStale:stale,planReadStale:stale,
  operationalRows:()=>fixture.filter(x=>x.state!=='출고완료'),productionClass:x=>rules.classify(x,'2026-10-06'),formatHfDate:v=>rules.day(v)||'미정',
  active(){},rememberProjectDetail(){},esc:v=>String(v||''),hfCardTone:()=>'',hfDueAlert:()=>''});
 vm.runInContext(code+';productionPlan("plan",true);',ctx);return main.innerHTML;
}
test('plan current count excludes shipping wait, needs-check and actual shipment; ID-less equipment stays visible',()=>{
 const html=render(false);assert.match(html,/현재 작업<\/small><b>2/);
 const current=html.split('<details>')[0];assert.match(current,/data-plan-order="WORK"/);assert.match(current,/data-plan-order="NEXT"/);
 assert.doesNotMatch(current,/data-plan-order="WAIT"|data-plan-order="CHECK"|data-plan-order="DONE"/);
 assert.match(html,/출고대기 · 1/);assert.match(html,/확인 필요 · 1/);
});
test('failed plan read retains prior cards but never reports a confirmed zero or current count',()=>{
 const html=render(true);assert.match(html,/현재 작업<\/small><b>확인 불가/);assert.match(html,/최신 조회 미확인/);assert.match(html,/data-plan-order="WORK"/);
 assert.match(html,/出|출고대기 · 최신 확인 불가/);assert.match(html,/미정 공정<\/small><b>확인 불가/);
});
