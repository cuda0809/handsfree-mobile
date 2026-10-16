import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const mobile=fs.readFileSync('kmt-sa2/mobile.js','utf8'),flow=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
function harness(){
 const items=[{orderId:'A1',team:'A',state:'조립 진행'},{orderId:'B1',team:'B',state:'전장 완료'},{orderId:'251210A',team:'B',state:'출고완료',actualDelivery:'2026-10-07'},{orderId:'C1',team:'C',state:'조립 진행'}];
 const c=vm.createContext({items,readStore:(k,f)=>f,coreSnapshot:true,lastReadErrorStatus:0,appProjects:[],projectMetaCache:()=>null,planOverviewCache:()=>({byOrder:{}}),latestUnifiedInputByOrder:()=>new Map(),hybridDueKey:()=>'',HfProductionRules:rules,isCarryoverStock:()=>false,priorityAssessment:()=>({reasons:[]}),productionClass:x=>rules.classify(x,'2026-10-16'),isCompletedOperational:x=>rules.classify(x,'2026-10-16')==='출고완료'});
 vm.runInContext(mobile.slice(mobile.indexOf('let selectedTeam='),mobile.indexOf('function itemById(')),c);
 vm.runInContext(flow.slice(flow.indexOf('function operationalRows('),flow.indexOf('// Display-only derived plan')),c);
 return c;
}
test('A/B/combined views select authoritative membership and keep the full snapshot intact',()=>{
 const c=harness(),before=JSON.stringify(c.items);
 assert.deepEqual(Array.from(c.operationalRows().map(x=>x.orderId)),['B1','251210A']);
 vm.runInContext("selectedTeam='A'",c);assert.deepEqual(Array.from(c.operationalRows().map(x=>x.orderId)),['A1']);
 vm.runInContext("selectedTeam='ALL'",c);assert.equal(c.operationalRows().length,3);assert.equal(c.operationalRows(false).length,2);
 assert.equal(JSON.stringify(c.items),before);
});
test('today issue list remains limited to actual manufacturing in every team scope',()=>{
 const c=harness();vm.runInContext(flow.slice(flow.indexOf('function currentProductionRows('),flow.indexOf('function displayedNextAction(')),c);
 for(const scope of ['A','B','ALL']){vm.runInContext(`selectedTeam='${scope}'`,c);const rows=c.currentProductionRows();assert.ok(rows.every(x=>x.state!=='출고완료'&&x.team!=='C'));assert.ok(rows.every(c.teamMatches));}
});
test('plan ingestion retains both teams even when the visible selection is B',()=>{
 assert.match(flow,/const allowed=new Set\(items\.filter\(isABTeam\)/);
 assert.match(mobile,/const next=d\.projects\.filter\(isABTeam\)/);
 assert.match(mobile,/items=c\.items\.filter\(isABTeam\)/);
});
test('A source snapshot provides planned next action without inventing actual fabrication or delivery',()=>{
 const resolved=rules.resolve([{recordId:'legacy',date:'2026-10-01',process:'출고',sourceMonth:'2026-10'},
 {recordId:'AVERIFIED|20261016|A1|861|20',date:'2026-10-20',process:'조립',sourceMonth:'2026-10',status:'계획',sourceRef:'생산A팀!U861'}]);
 const x={team:'A',state:'',...resolved};assert.equal(resolved.planSourceVerified,true);assert.equal(resolved.planDelivery,'');
 assert.equal(rules.classify(x,'2026-10-16'),'작업 예정');assert.equal(rules.manufacturingNow(x,'2026-10-16'),false);
 assert.equal(rules.nextAction(x,'2026-10-16'),'조립 · 2026-10-20');
});
test('home current-work and project manufacturing buckets agree in every team scope',()=>{
 const c=harness();c.items.push({orderId:'A-wait',team:'A',state:'납품 전 마무리 작업 중'});
 for(const [start,end] of [['function projectBucket(','function latestUnifiedInputByOrder('],['function projectViewBucket(','function projectReviewReason('],['function homeStatRows(','function homeStatHtml(']])vm.runInContext(flow.slice(flow.indexOf(start),flow.indexOf(end)),c);
 for(const scope of ['A','B','ALL']){vm.runInContext(`selectedTeam='${scope}'`,c);const rows=c.operationalRows();
  assert.deepEqual(Array.from(c.homeStatRows(rows,'current').map(x=>x.orderId)),Array.from(rows.filter(x=>c.projectViewBucket(x)==='active').map(x=>x.orderId)));
  assert.ok(!c.homeStatRows(rows,'current').some(x=>x.orderId==='A-wait'));
 }
});
