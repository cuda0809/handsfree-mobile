import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
const home=source.slice(source.indexOf('function renderUnifiedHome('),source.indexOf('function projectMetaCache('));
function render(confirmed,stale){
 const main={innerHTML:'',querySelectorAll:()=>[]};
 const ctx={main,coreSnapshot:confirmed,readStale:stale,screen:'home',lastRead:'',Date,Map,
  setTimeout:()=>0,active(){},syncProjectMeta(){},syncPlanOverview(){},operationalRows:()=>[],
  isCompletedOperational:()=>false,planStagesOnDay:()=>[],hybridDueKey:()=>'',rememberProjectDetail(){},
  esc:String,banner(){}};
 vm.createContext(ctx);vm.runInContext(home+';renderUnifiedHome();',ctx);return main.innerHTML;
}
test('unavailable or stale Core never presents zero issues as a confirmed result',()=>{
 for(const [confirmed,stale] of [[false,false],[false,true],[true,true]]){
  const html=render(confirmed,stale);
  assert.match(html,/현장 이슈<\/b><span>확인 불가/);
  assert.match(html,/우선순위 1<\/small><b>확인 불가/);
  assert.match(html,/최신 상태 다시 확인/);
  assert.doesNotMatch(html,/현재 진행 이슈가 없습니다/);
  assert.doesNotMatch(html,/0건이 있습니다/);
 }
});
test('verified empty Core can accurately show zero issues',()=>{
 const html=render(true,false);assert.match(html,/현장 이슈<\/b><span>0대/);
 assert.match(html,/현재 진행 이슈가 없습니다/);assert.doesNotMatch(html,/최신 상태 확인 필요/);
});
