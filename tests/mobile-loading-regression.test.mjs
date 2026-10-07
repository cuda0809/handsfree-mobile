import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const mobile=fs.readFileSync('kmt-sa2/mobile.js','utf8');
const app=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
test('Core and catalog start together instead of stacking upstream waits',async()=>{
 const calls=[];let release;
 const gate=new Promise(r=>release=r);
 const ctx=vm.createContext({readApp:async b=>{calls.push(b.action);await gate;return b.action==='core'?{projects:[],generatedAt:'now'}:{issues:[]};},isBTeam:()=>true});
 vm.runInContext(mobile.slice(mobile.indexOf('async function refreshCachedCore('),mobile.indexOf('function renderCoreScreen(')),ctx);
 const pending=ctx.refreshCachedCore();await Promise.resolve();
 const started=[...calls];release();await pending;
 assert.deepEqual(started,['core','catalog']);
});
test('confirmed B-team snapshot populates metadata without another Core request or projects-array exception',async()=>{
 let requests=0,renders=0;const saved=[];
 const ctx=vm.createContext({coreSnapshot:true,readStale:false,items:[{team:'B',orderId:'60-2',state:'전장 완료',coreVerified:true}],appProjects:[],appIssues:[],screen:'projects',filter:'active',projectMetaPending:null,PROJECT_META_KEY:'meta',projectMetaCache:()=>null,applyProjectMeta:()=>false,appCall:async()=>{requests++;return {projects:[{team:'B',orderId:'60-2'}]};},refresh:async()=>true,persist:(k,v)=>saved.push(v),projects:()=>renders++,Date,home(){},todayIssues(){}});
 vm.runInContext(app.slice(app.indexOf('async function syncProjectMeta('),app.indexOf('function scheduleText(')),ctx);
 const result=await ctx.syncProjectMeta(true);
 assert.equal(requests,0);assert.equal(result.projects[0].state,'전장 완료');
 assert.equal(ctx.appProjects[0].orderId,'60-2');assert.equal(saved[0].source,'core');
});
test('refresh wrapper preserves nonforced resume reads',async()=>{
 const flags=[];const ctx=vm.createContext({refresh:async force=>{flags.push(force);return true;},screen:'home'});
 vm.runInContext(app.slice(app.indexOf('const eventRefreshBase=refresh;'),app.indexOf('\nhome();',app.indexOf('const eventRefreshBase=refresh;'))),ctx);
 await ctx.refresh(false);await ctx.refresh();assert.deepEqual(flags,[false,true]);
});
