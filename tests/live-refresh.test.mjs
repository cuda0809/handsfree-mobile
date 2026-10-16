import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('kmt-sa2/live-refresh.js','utf8');
function fixture(){
 const events={},timers=[],elements=new Map();let reads=0,plans=0,renders=0,scroll;
 const host={appendChild(x){x.parentElement=this;elements.set(x.id,x);}};
 const doc={visibilityState:'visible',activeElement:null,querySelector:s=>s==='.hf-connection-row'?host:null,querySelectorAll:()=>[],createElement:()=>({setAttribute(){}}),addEventListener:(name,fn)=>events[name]=fn};
 const c=vm.createContext({document:doc,dialog:{open:false,addEventListener:(n,f)=>events['dialog-'+n]=f},recognition:null,notes:()=>[],navigator:{onLine:true},window:{scrollX:0,scrollY:350,scrollTo:(x,y)=>scroll=[x,y],addEventListener:(n,f)=>events[n]=f},$:id=>elements.get(id),renderCoreScreen:()=>renders++,banner(){},readPending:null,lastRead:'now',readStale:false,readMessage:'',lastReadErrorStatus:0,lastCoreAttempt:0,lastPlanAttempt:0,refresh:async()=>{reads++;return true;},syncPlanOverview:async()=>{plans++;return {};},setInterval:(f,ms)=>timers.push({f,ms}),setTimeout:f=>f(),console});
 vm.runInContext(source,c);
 return {c,doc,events,timers,elements,get reads(){return reads;},get plans(){return plans;},get renders(){return renders;},get scroll(){return scroll;}};
}
test('running visible app polls at30s and manual button reads data without page reload',async()=>{
 const f=fixture();assert.equal(f.timers[0].ms,10000);
 await f.timers[0].f();assert.equal(f.reads,1);assert.equal(f.plans,1);
 await f.elements.get('hfRefreshNow').onclick();assert.equal(f.reads,2);
 assert.doesNotMatch(source,/location\.|fetch\(|sa2-write|submitUnifiedEvent/);
});
test('hidden, offline, auth-failed or recently checked app does not poll',async()=>{
 for(const state of ['hidden','offline','auth','recent']){
  const f=fixture();if(state==='hidden')f.doc.visibilityState='hidden';if(state==='offline')f.c.navigator.onLine=false;if(state==='auth')f.c.lastReadErrorStatus=401;if(state==='recent')f.c.lastCoreAttempt=Date.now();
  await f.c.refreshLiveData();assert.equal(f.reads,0,state);
 }
});
test('overlapping refreshes join one read, failures release the control',async()=>{
 const f=fixture();let release,calls=0;
 f.c.refresh=()=>{calls++;return new Promise(r=>release=r);};
 const a=f.c.refreshLiveData(true),b=f.c.refreshLiveData(true);assert.equal(calls,1);assert.equal(f.elements.get('hfRefreshNow').disabled,true);
 release(false);assert.deepEqual(await Promise.all([a,b]),[false,false]);assert.equal(f.elements.get('hfRefreshNow').disabled,false);
});
test('open editor, drafts, keyboard, voice and pending save defer rendering but keep reads alive',async()=>{
 for(const mode of ['dialog','draft','keyboard','voice','save']){
  const f=fixture();if(mode==='dialog')f.c.dialog.open=true;if(mode==='draft')f.doc.querySelectorAll=()=>[{value:'preserved draft'}];if(mode==='keyboard')f.doc.activeElement={matches:()=>true};if(mode==='voice')f.c.recognition={};if(mode==='save')f.c.notes=()=>[{status:'sending'}];
  f.c.renderCoreScreen();assert.equal(f.renders,0,mode);await f.c.refreshLiveData(true);assert.equal(f.reads,1,mode);
  f.c.dialog.open=false;f.doc.querySelectorAll=()=>[];f.doc.activeElement=null;f.c.recognition=null;f.c.notes=()=>[];f.c.flushLiveRender();assert.equal(f.renders,1,mode);assert.deepEqual(f.scroll,[0,350]);
 }
});
test('updated project list keeps its search and scroll position',()=>{
 const f=fixture(),search={value:'260728A-064'};f.elements.set('hybridProjectSearch',search);let searched=0;f.c.renderHybridProjects=()=>searched++;
 f.c.renderCoreScreen();assert.equal(search.value,'260728A-064');assert.equal(searched,1);assert.deepEqual(f.scroll,[0,350]);
});
test('plan completion uses the same protected renderer and page loads the new module',()=>{
 const flow=fs.readFileSync('kmt-sa2/app-flow.js','utf8'),html=fs.readFileSync('kmt-sa2/index.html','utf8');
 const plans=flow.slice(flow.indexOf('const changed=applyPlanOverview(byOrder)'),flow.indexOf('function planCountLabel'));
 assert.match(plans,/renderCoreScreen\(\)/);assert.doesNotMatch(plans,/todayIssues\(\)/);
 assert.ok(html.indexOf('./live-refresh.js')>html.indexOf('./app-flow.js'));
});
