// HandsFree Mobile REAL 0.7 — async source provider.
const {buildCore}=require('./runtime');
const reference=require('./data');
const appsScript=require('./apps-script-v07');
const google=require('./google-sheets-v04');
let cache={core:null,expiresAt:0,mode:null};
const CACHE_MS=20000;

function privateSnapshot(){
  const raw=process.env.HF_OS_V3_SNAPSHOT_JSON;
  if(!raw)return null;
  try{
    const parsed=JSON.parse(raw);
    return parsed&&Array.isArray(parsed.projects)?parsed:null;
  }catch(e){return{__error:e.message};}
}

function buildReferenceCore(warning){
  const snapshot={
    meta:{asOf:reference.AS_OF},
    projects:(reference.projects||[]).map(p=>({...p,status:p.status||p.state||'',due:p.due||p.customerDueDate||p.shipmentPlan||null,progressText:p.progressText||(p.progress!==null&&p.progress!==undefined?`${p.progress}%`:null)})),
    events:reference.events||[],issues:reference.issues||[],changes:[],capacity:[],briefing:[],analysis90:[]
  };
  const core=buildCore(snapshot,{mode:'reference-snapshot',label:'REFERENCE',projectSource:'V3_NORMALIZED_SNAPSHOT',issueSource:'V3_NORMALIZED_SNAPSHOT',runtimeDirectGoogleRead:false,runtimeLiveRead:false,privateRuntimeSource:false,auth:null,warning});
  for(const p of core.projects){
    const old=reference.projectById?.(p.id)||(reference.projects||[]).find(x=>x.id===p.id);if(!old)continue;
    if(old.risk)p.risk=old.risk;if(old.stage)p.stage=old.stage;if(old.nextGate)p.nextGate=old.nextGate;if(old.customerDueDate)p.customerDueDate=old.customerDueDate;if(old.shipmentPlan)p.shipmentPlan=old.shipmentPlan;if(old.inspection)p.inspection=old.inspection;if(old.supplyStatus)p.supplyStatus=old.supplyStatus;if(old.blocker){p.blocker=old.blocker;p.riskReason=old.blocker;}p.plannedToday=Boolean(old.plannedToday);if(p.readiness?.criticalMaterials&&old.supplyStatus)p.readiness.criticalMaterials.purchaseStatus=old.supplyStatus;
  }
  const baseMetrics=core.metrics.bind(core);core.metrics=()=>({...baseMetrics(),todayWork:reference.metrics?.().todayWork??baseMetrics().todayWork});
  return core;
}

function decorateFailure(core,meta){const original=core.sourceHealth;core.sourceHealth=()=>({...original(),...meta});return core;}

async function getCore({force=false}={}){
  const now=Date.now();if(!force&&cache.core&&cache.expiresAt>now)return cache.core;
  const privateSource=privateSnapshot();

  // 1) Preferred no-billing LIVE bridge: private Apps Script Web App + server-side token.
  if(appsScript.configured()){
    try{
      const snapshot=await appsScript.loadSnapshot();
      const core=buildCore(snapshot,{mode:'apps-script-live',label:'OS v3 LIVE',privateRuntimeSource:false,runtimeDirectGoogleRead:false,runtimeLiveRead:true,auth:'apps-script-token',fetchedAt:snapshot?.meta?.fetchedAt||new Date().toISOString(),projectSource:'OS_V3_APPS_SCRIPT',issueSource:'OS_V3_APPS_SCRIPT',capacitySource:'OS_V3_APPS_SCRIPT'});
      cache={core,expiresAt:now+CACHE_MS,mode:'apps-script-live'};return core;
    }catch(e){
      const core=decorateFailure(buildReferenceCore(`Apps Script bridge configured but read failed: ${e.message}`),{mode:'apps-script-error',label:'APPS SCRIPT ERROR',auth:'apps-script-token',runtimeLiveRead:false});
      cache={core,expiresAt:now+5000,mode:'apps-script-error'};return core;
    }
  }

  // 2) Optional future direct Google service-account bridge.
  if(google.configured()){
    try{
      const snapshot=await google.loadSnapshot();
      const core=buildCore(snapshot,{mode:'google-live',label:'OS v3 LIVE',privateRuntimeSource:false,runtimeDirectGoogleRead:true,runtimeLiveRead:true,auth:'service-account',fetchedAt:new Date().toISOString()});
      cache={core,expiresAt:now+CACHE_MS,mode:'google-live'};return core;
    }catch(e){
      const core=decorateFailure(buildReferenceCore(`Google bridge configured but read failed: ${e.message}`),{mode:'google-error',label:'GOOGLE ERROR',auth:'service-account',runtimeLiveRead:false});
      cache={core,expiresAt:now+5000,mode:'google-error'};return core;
    }
  }

  // 3) Private snapshot is a safe fallback but never counts as LIVE.
  if(privateSource&&!privateSource.__error){
    const core=buildCore(privateSource,{mode:'private-runtime',label:'OS v3 PRIVATE',privateRuntimeSource:true,runtimeDirectGoogleRead:false,runtimeLiveRead:false,auth:'runtime-secret'});
    cache={core,expiresAt:now+CACHE_MS,mode:'private-runtime'};return core;
  }

  const warning=privateSource?.__error?`Private source parse error: ${privateSource.__error}`:'LIVE bridge is not configured.';
  const core=buildReferenceCore(warning);cache={core,expiresAt:now+5000,mode:'reference-snapshot'};return core;
}
module.exports={getCore};
