import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
const code=source.slice(source.indexOf('async function syncPlanOverview('),source.indexOf('function productionPlanRows('));
function harness(response){
 const prior={completePlan:true,cachedAt:'2000-01-01',byOrder:{OLD:{planTimeline:[{date:'2026-10-06',process:'조립'}]}}};
 const ctx={Date,Map,JSON,Error,items:[{team:'B',orderId:'NEW'}],coreSnapshot:true,screen:'home',planReadStale:true,planOverviewPending:null,PLAN_OVERVIEW_KEY:'fixture',calls:[],saved:null,rendered:0,
  planOverviewCache:()=>prior,applyPlanOverview:()=>true,summarizePlanRecords:r=>({planTimeline:r}),
  persist:(k,v)=>{ctx.saved=v;},home:()=>ctx.rendered++,toast(){},
  appCall:async b=>{ctx.calls.push(b);if(response instanceof Error)throw response;return response;}};
 vm.createContext(ctx);return {ctx,run:()=>vm.runInContext(code+';syncPlanOverview(true)',ctx)};
}
test('all project plans refresh in one authenticated request and removed rows disappear',async()=>{
 const h=harness({generatedAt:'now',records:[{orderId:'NEW',date:'2026-10-06',process:'전장'}]});await h.run();
 assert.equal(h.ctx.calls.length,1);assert.equal(h.ctx.calls[0].action,'plans');
 assert.equal(h.ctx.saved.byOrder.OLD,undefined);assert.equal(h.ctx.saved.byOrder.NEW.planTimeline.length,1);
 assert.equal(h.ctx.saved.completePlan,true);assert.equal(h.ctx.planReadStale,false);
});
test('failed or malformed plan reads preserve prior cache without a fresh timestamp',async()=>{
 for(const d of [Error('offline'),{generatedAt:'now',records:null},{generatedAt:'now',records:[{orderId:'NEW',date:'invalid',process:'조립'}]}]){
  const h=harness(d);assert.equal(await h.run(),null);assert.equal(h.ctx.saved,null);assert.equal(h.ctx.planReadStale,true);
 }
});
test('verified empty plan response clears prior plans',async()=>{
 const h=harness({generatedAt:'now',records:[]});await h.run();assert.equal(Object.keys(h.ctx.saved.byOrder).length,0);
});
test('cold start sends plans before Core completes and never accepts plans when Core fails',async()=>{
 for(const confirmed of [true,false]){
  const h=harness({generatedAt:'now',records:[{orderId:'NEW',date:'2026-10-06',process:'전장'}]});
  h.ctx.coreSnapshot=false;let release;
  h.ctx.refresh=()=>new Promise(r=>release=r);
  const pending=h.run();await Promise.resolve();
  assert.equal(h.ctx.calls.length,1,'plans must start while Core is pending');
  assert.equal(h.ctx.saved,null,'unverified Core cannot establish plan freshness');
  release(confirmed);const result=await pending;
  if(confirmed){assert.ok(result);assert.equal(h.ctx.saved.completePlan,true);}
  else{assert.equal(result,null);assert.equal(h.ctx.saved,null);assert.equal(h.ctx.planReadStale,true);}
 }
});
