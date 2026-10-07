import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const rules=createRequire(import.meta.url)('../kmt-sa2/production-rules.js');
const source=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
test('all operational views fail closed for other teams and stale metadata; completed detail uses current snapshot',()=>{
 const fixture=[{orderId:'B-active',team:'B',state:'조립 진행'},{orderId:'B-done',team:'B',state:'출고완료',actualDelivery:'2026-09-22'},...['A','C','D',''].map(team=>({orderId:team+'-other',team,state:'조립 진행'}))];
 const c=vm.createContext({items:fixture,coreSnapshot:true,lastReadErrorStatus:0,appProjects:[],projectMetaCache:()=>({projects:[{orderId:'A-stale',team:'A'}]}),planOverviewCache:()=>({byOrder:{'A-other':{planAssembly:'2026-10-12'}}}),latestUnifiedInputByOrder:()=>new Map(),hybridDueKey:()=>'',productionClass:x=>rules.classify(x,'2026-10-07'),isCompletedOperational:x=>rules.classify(x,'2026-10-07')==='출고완료',PROJECT_DETAIL_SNAPSHOT:new Map([['B-done',{actualDelivery:'2026-09-01'}],['A-other',{customer:'stale A'}]])});
 vm.runInContext(source.slice(source.indexOf('function operationalRows('),source.indexOf('function planStagesOnDay(')),c);
 vm.runInContext(source.slice(source.indexOf('function projectDetailRow('),source.indexOf('async function openProject(')),c);
 assert.deepEqual(Array.from(c.operationalRows().map(x=>x.orderId)).sort(),['B-active','B-done']);
 assert.equal(c.operationalRows(false).length,1);
 assert.equal(c.projectDetailRow('B-done',{actualDelivery:'2026-09-02'}).actualDelivery,'2026-09-22');
 assert.equal(c.projectDetailRow('A-other',{customer:'A'}).customer,undefined);
});
test('equipment picker joins the authoritative team rather than catalog status or job year',async()=>{
 const c=vm.createContext({appCall:async b=>b.action==='catalog'?{projects:[{orderId:'A',state:'조립'},{orderId:'B25',state:'조립'}],issues:[{orderId:'A'},{orderId:'B25'}]}:{projects:[{orderId:'A',team:'A'},{orderId:'B25',team:'B',state:'출고완료'}]},appProjects:[],appIssues:[]});
 vm.runInContext(source.slice(source.indexOf('async function getAppProjects('),source.indexOf('async function allProjects(')),c);
 assert.deepEqual(Array.from((await c.getAppProjects()).map(x=>x.orderId)),['B25']);
 assert.deepEqual(Array.from(c.appIssues.map(x=>x.orderId)),['B25']);
});
