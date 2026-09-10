// HandsFree Mobile REAL 0.4 — async source provider.
const {buildCore}=require('./runtime');
const reference=require('./data');
const google=require('./google-sheets-v04');
let cache={core:null,expiresAt:0,mode:null};
const CACHE_MS=20000;

function privateSnapshot(){
  const raw=process.env.HF_OS_V3_SNAPSHOT_JSON;
  if(!raw)return null;
  try{
    const parsed=JSON.parse(raw);
    return parsed&&Array.isArray(parsed.projects)?parsed:null;
  }catch(e){
    return{__error:e.message};
  }
}

function buildReferenceCore(warning){
  // The public reference is legacy-normalized data. Route it through the same
  // REAL 0.4 readiness engine used by private/live sources so parity tests
  // exercise the actual decision model instead of bypassing it.
  const snapshot={
    meta:{asOf:reference.AS_OF},
    projects:(reference.projects||[]).map(p=>({
      ...p,
      status:p.status||p.state||'',
      due:p.due||p.customerDueDate||p.shipmentPlan||null,
      progressText:p.progressText||(p.progress!==null&&p.progress!==undefined?`${p.progress}%`:null)
    })),
    events:reference.events||[],
    issues:reference.issues||[],
    changes:[],
    capacity:[],
    briefing:[],
    analysis90:[]
  };
  const core=buildCore(snapshot,{
    mode:'reference-snapshot',
    label:'REFERENCE',
    projectSource:'V3_NORMALIZED_SNAPSHOT',
    issueSource:'V3_NORMALIZED_SNAPSHOT',
    runtimeDirectGoogleRead:false,
    privateRuntimeSource:false,
    auth:null,
    warning
  });

  // Keep facts already present in the legacy reference, but never restore the
  // legacy assemblyReady flag: REAL 0.4 must recalculate it from issue evidence
  // so quality rework is not mistaken for missing material.
  for(const p of core.projects){
    const old=reference.projectById?.(p.id)||(reference.projects||[]).find(x=>x.id===p.id);
    if(!old)continue;
    if(old.risk)p.risk=old.risk;
    if(old.stage)p.stage=old.stage;
    if(old.nextGate)p.nextGate=old.nextGate;
    if(old.customerDueDate)p.customerDueDate=old.customerDueDate;
    if(old.shipmentPlan)p.shipmentPlan=old.shipmentPlan;
    if(old.inspection)p.inspection=old.inspection;
    if(old.supplyStatus)p.supplyStatus=old.supplyStatus;
    if(old.blocker){p.blocker=old.blocker;p.riskReason=old.blocker;}
    p.plannedToday=Boolean(old.plannedToday);
    if(p.readiness?.criticalMaterials&&old.supplyStatus){
      p.readiness.criticalMaterials.purchaseStatus=old.supplyStatus;
    }
  }

  // Reference mode has no CAPA rows by design; preserve only the already
  // published planned-today count instead of inventing FTE data.
  const baseMetrics=core.metrics.bind(core);
  core.metrics=()=>({...baseMetrics(),todayWork:reference.metrics?.().todayWork??baseMetrics().todayWork});
  return core;
}

async function getCore({force=false}={}){
  const now=Date.now();
  if(!force&&cache.core&&cache.expiresAt>now)return cache.core;
  const privateSource=privateSnapshot();
  if(privateSource&&!privateSource.__error){
    const core=buildCore(privateSource,{mode:'private-runtime',label:'OS v3 PRIVATE',privateRuntimeSource:true,runtimeDirectGoogleRead:false,auth:'runtime-secret'});
    cache={core,expiresAt:now+CACHE_MS,mode:'private-runtime'};
    return core;
  }
  if(google.configured()){
    try{
      const snapshot=await google.loadSnapshot();
      const core=buildCore(snapshot,{mode:'private-runtime',label:'OS v3 LIVE',privateRuntimeSource:false,runtimeDirectGoogleRead:true,auth:'service-account',fetchedAt:new Date().toISOString()});
      cache={core,expiresAt:now+CACHE_MS,mode:'google-live'};
      return core;
    }catch(e){
      const core=buildReferenceCore(`Google bridge configured but read failed: ${e.message}`);
      const originalHealth=core.sourceHealth;
      core.sourceHealth=()=>({...originalHealth(),mode:'google-error',label:'GOOGLE ERROR',auth:'service-account'});
      cache={core,expiresAt:now+5000,mode:'google-error'};
      return core;
    }
  }
  const warning=privateSource?.__error?`Private source parse error: ${privateSource.__error}`:'Google Sheets bridge credentials are not configured.';
  const core=buildReferenceCore(warning);
  cache={core,expiresAt:now+5000,mode:'reference-snapshot'};
  return core;
}
module.exports={getCore};
