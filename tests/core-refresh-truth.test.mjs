import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const baseline=process.argv.includes('--baseline');
const source=baseline?execFileSync('git',['show','e8d6199:kmt-sa2/mobile.js'],{encoding:'utf8'}):fs.readFileSync('kmt-sa2/mobile.js','utf8');
const row={projectId:'PRJ-A',orderId:'JOB-A',issueId:'ISS-A',state:'조립 진행',nextAction:'검수',issueStatus:'OPEN',since:'2026-09-01',sourceLatestUpdate:'2026-10-01',currentIssue:'old',recentEvent:'old'};
function harness(fetcher,cache){
 const storage=new Map(cache?[['hf-core-status-v1',JSON.stringify(cache)]]:[]),stub={addEventListener(){},classList:{toggle(){}},querySelector(){return null},replaceChildren(){},after(){}};
 const context=vm.createContext({document:{getElementById:()=>stub,querySelector:()=>stub,querySelectorAll:()=>[],visibilityState:'visible'},window:{addEventListener(){}},navigator:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>1,clearTimeout(){},setInterval(){},AbortController,Date,console,fetch:fetcher});
 vm.runInContext(source.slice(0,source.indexOf('\nfunction card(')),context);
 vm.runInContext('banner=()=>{}; home=()=>{};',context);
 return {run:s=>vm.runInContext(s,context),storage};
}
const cache={cachedAt:'2026-10-01T01:00:00Z',sourceDate:'2026-10-01',items:[row]};
function responder(projects,issues=[{issueId:'ISS-A',orderId:'JOB-A',state:row.state,status:'OPEN'}]){return async(path,options)=>({ok:true,status:200,json:async()=>path==='/api/sa2-real-status'?{ok:true,live:true,currentStatus:projects,sourceLatestDate:'2026-10-04'}:JSON.parse(options.body).action==='core'?{ok:true,projects,generatedAt:'2026-10-06T00:00:00Z'}:{ok:true,issues,projects:[]}});}
const h=harness(responder([{...row,nextAction:'출고',currentIssue:'new',recentEvent:'new'}, {...row,projectId:'PRJ-B',orderId:'JOB-B',issueId:''}]),cache);
assert.equal(h.run('readStale'),true);
await h.run('refresh()');
if(baseline){
 assert.equal(h.run('items.length'),1);assert.equal(h.run('items[0].nextAction'),'검수');assert.match(h.run('readMessage'),/최신 상태 확인/);
 console.log('REPRODUCED: new row missing, nextAction/content unchanged, partial read marked latest');process.exit(0);
}
assert.equal(h.run('items.length'),2);assert.equal(h.run('items[0].nextAction'),'출고');assert.equal(h.run('items[0].currentIssue'),'new');assert.equal(h.run('items[0].recentEvent'),'new');assert.equal(h.run('items[1].issueId'),'');assert.equal(h.run('items[0].since'),row.since);assert.equal(h.run('items[0].sourceLatestUpdate'),row.sourceLatestUpdate);
assert.equal(h.run('items[0].projectId'),'PRJ-A');assert.notEqual(h.run('items[0].id'),0);assert.equal(h.run('readStale'),false);
const saved=JSON.parse(h.storage.get('hf-core-status-v1'));
for(const [name,fetcher] of [
 ['failure',async()=>{throw Error('offline')}],['timeout',async()=>{throw Object.assign(Error('timeout'),{name:'AbortError'})}],
 ['invalid',async()=>({ok:true,status:200,json:async()=>({ok:true,projects:null})})],
 ['partial fallback',async()=>({ok:true,status:200,json:async()=>({ok:true,projects:[],issues:[],coreFallback:true})})],
 ['malformed row',responder([null])],['duplicate ID',responder([row,row])]
]){
 const f=harness(fetcher,saved);assert.equal(await f.run('refresh()'),false,name);assert.equal(f.run('readStale'),true);assert.match(f.run('readMessage'),/갱신 실패|일부 확인/);assert.equal(f.run('sourceDate'),saved.sourceDate);assert.equal(f.run('items[0].nextAction'),'출고');assert.equal(f.storage.get('hf-core-status-v1'),JSON.stringify(saved));
}
const auth=harness(async()=>({ok:false,status:401,json:async()=>({ok:false,error:'unauthorized'})}),saved);
assert.equal(await auth.run('refresh()'),false);assert.equal(auth.run('live'),false);assert.equal(auth.run('items.length'),0);assert.equal(auth.storage.get('hf-core-status-v1'),JSON.stringify(saved));
const removed=harness(responder([],[]),saved);await removed.run('refresh()');assert.equal(removed.run('items.length'),0);assert.equal(removed.run('readStale'),false);
const restart=harness(responder([{...row,projectId:'PRJ-B',orderId:'JOB-B',issueId:''},row]),saved);await restart.run('refresh()');assert.equal(restart.run('itemById(itemIdentity({projectId:"PRJ-A",orderId:"JOB-A"})).orderId'),'JOB-A');assert.equal(restart.run('items[0].since'),row.since);
const empty=JSON.parse(removed.storage.get('hf-core-status-v1'));const reopened=harness(responder([],[]),empty);assert.equal(reopened.run('live'),true);assert.equal(reopened.run('readStale'),true);
console.log('PASS isolated executable refresh: additions, field-only updates, removal, missing issueId, failures/timeouts/invalid/partial/auth, restart/empty cache, stable IDs and unchanged business timestamps');
const app=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
function installRows(h){
 h.run('var appProjects=[]; function projectMetaCache(){return {projects:[{orderId:"REMOVED",state:"조립",currentIssue:"stale"}]}}; function planOverviewCache(){return {byOrder:{REMOVED:{state:"조립"}}}}; function latestUnifiedInputByOrder(){return new Map([["JOB-A",{stateSyncVersion:"natural-v3",displayState:"old local",text:"old local"}]])}; function formatHfDate(x){return x||"미정"}; function hybridDueKey(x){return x||""}');
 for(const [start,end] of [['function isCompletedOperational(','function latestUnifiedInputByOrder('],['function operationalRows(','function planStagesOnDay(']])h.run(app.slice(app.indexOf(start),app.indexOf(end)));
}
installRows(h);assert.equal(h.run('operationalRows()[0].state'),row.state);assert.equal(h.run('operationalRows()[0].recentEvent'),'new');assert.equal(h.run('operationalRows().some(x=>x.orderId==="REMOVED")'),false);
const closed=harness(responder([{...row,state:'출고완료',actualDelivery:'2026-10-05'}],[{issueId:'ISS-A',orderId:'JOB-A',status:'CLOSED'}]),cache);await closed.run('refresh()');installRows(closed);assert.equal(closed.run('operationalRows(false).length'),0);assert.equal(closed.run('items[0].priority'),3);
installRows(removed);assert.equal(removed.run('operationalRows().length'),0);
installRows(auth);assert.equal(auth.run('operationalRows().length'),0);
const contentOnly=harness(responder([{...row,currentIssue:'content-only',recentEvent:'progress-only'}]),cache);await contentOnly.run('refresh()');assert.equal(contentOnly.run('items[0].nextAction'),row.nextAction);assert.equal(contentOnly.run('items[0].currentIssue'),'content-only');assert.equal(contentOnly.run('items[0].recentEvent'),'progress-only');
const renderFailure=harness(responder([row]),cache);renderFailure.run('home=()=>{throw Error("render_failed")}');assert.equal(await renderFailure.run('refresh()'),false);assert.equal(renderFailure.run('sourceDate'),cache.sourceDate);assert.equal(renderFailure.storage.get('hf-core-status-v1'),JSON.stringify(cache));assert.equal(renderFailure.run('readStale'),true);
const secondFail=harness(async(path,opts)=>JSON.parse(opts.body).action==='core'?{ok:true,status:200,json:async()=>({ok:true,projects:[row],generatedAt:'valid'})}:{ok:false,status:502,json:async()=>({ok:false,error:'failed'})},saved);assert.equal(await secondFail.run('refresh()'),false);assert.equal(secondFail.storage.get('hf-core-status-v1'),JSON.stringify(saved));
const nonJSON=harness(async()=>({ok:true,status:200,json:async()=>{throw Error('bad json')}}),saved);assert.equal(await nonJSON.run('refresh()'),false);assert.equal(nonJSON.run('readStale'),true);
console.log('PASS display rules: completed/excluded rows, server fields beat local overlays, auth hides metadata, empty snapshot, render failure and second-query/non-JSON failure preserve last-good');

const nextOnly=harness(responder([{...row,nextAction:'next-only'}]),cache);await nextOnly.run('refresh()');assert.equal(nextOnly.run('items[0].state'),row.state);assert.equal(nextOnly.run('items[0].nextAction'),'next-only');assert.equal(nextOnly.run('items[0].currentIssue'),row.currentIssue);
const stateOnly=harness(responder([{...row,state:'검수 진행'}]),cache);await stateOnly.run('refresh()');assert.equal(stateOnly.run('items[0].since'),row.since);assert.equal(stateOnly.run('items[0].sourceLatestUpdate'),row.sourceLatestUpdate);
const cleared=harness(responder([{...row,nextAction:'',currentIssue:'',recentEvent:''}]),cache);await cleared.run('refresh()');installRows(cleared);cleared.run('const PROJECT_DETAIL_SNAPSHOT=new Map([["JOB-A",{nextAction:"stale",recentEvent:"stale"}]]);');cleared.run(app.slice(app.indexOf('function projectDetailRow('),app.indexOf('async function openProject(')));assert.equal(cleared.run('projectDetailRow("JOB-A",{nextAction:"stale"}).nextAction'),'');assert.equal(cleared.run('projectDetailRow("JOB-A").recentEvent'),'');
console.log('PASS nextAction-only, cleared detail fields and state-only reads never create business timestamps');

const historical=harness(responder([row],[{issueId:'old',orderId:'JOB-A',status:'CLOSED'},{issueId:'cancelled',orderId:'JOB-A',status:'CANCELLED'},{issueId:'ISS-A',orderId:'JOB-A',status:'MONITOR'}]),cache);assert.equal(await historical.run('refresh()'),true);assert.equal(historical.run('items[0].issueId'),'ISS-A');
const ambiguous=harness(responder([row],[{issueId:'one',orderId:'JOB-A',status:'OPEN'},{issueId:'two',orderId:'JOB-A',status:'MONITOR'}]),cache);assert.equal(await ambiguous.run('refresh()'),false);assert.equal(ambiguous.run('readStale'),true);
console.log('PASS canonical catalog includes historical duplicates; active issue wins, multiple active issues fail closed');
if(process.env.CORE_LEDGER_FIXTURE){
 const real=JSON.parse(fs.readFileSync(process.env.CORE_LEDGER_FIXTURE,'utf8'));
 const actual=harness(responder(real.projects,real.issues),cache);assert.equal(await actual.run('refresh()'),true);installRows(actual);
 assert.equal(actual.run('items.length'),192);assert.equal(actual.run('operationalRows(false).length'),62);
 assert.equal(actual.run('operationalRows(false).filter(x=>(x.issueId||String(x.recentEvent||x.currentIssue||x.cause||"").trim())&&x.priority!==3).length'),16);
 assert.equal(actual.run('operationalRows(false).find(x=>x.orderId==="260728A-064").currentIssue.includes("10/15")'),true);
 console.log('PASS current read-only ledger fixture: 192 projects / 62 active / 16 meaningful issues; latest 10/15 material note retained');
}
