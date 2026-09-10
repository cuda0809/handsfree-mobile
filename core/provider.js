// HandsFree Mobile REAL 0.4 — async source provider.
const {buildCore,buildReference}=require('./runtime');
const google=require('./google-sheets-v04');
let cache={core:null,expiresAt:0,mode:null};
const CACHE_MS=20000;
function privateSnapshot(){const raw=process.env.HF_OS_V3_SNAPSHOT_JSON;if(!raw)return null;try{const parsed=JSON.parse(raw);return parsed&&Array.isArray(parsed.projects)?parsed:null;}catch(e){return{__error:e.message};}}
async function getCore({force=false}={}){
  const now=Date.now();if(!force&&cache.core&&cache.expiresAt>now)return cache.core;
  const privateSource=privateSnapshot();
  if(privateSource&&!privateSource.__error){const core=buildCore(privateSource,{mode:'private-runtime',label:'OS v3 PRIVATE',privateRuntimeSource:true,runtimeDirectGoogleRead:false,auth:'runtime-secret'});cache={core,expiresAt:now+CACHE_MS,mode:'private-runtime'};return core;}
  if(google.configured()){
    try{const snapshot=await google.loadSnapshot();const core=buildCore(snapshot,{mode:'private-runtime',label:'OS v3 LIVE',privateRuntimeSource:false,runtimeDirectGoogleRead:true,auth:'service-account',fetchedAt:new Date().toISOString()});cache={core,expiresAt:now+CACHE_MS,mode:'google-live'};return core;}
    catch(e){const core=buildReference(`Google bridge configured but read failed: ${e.message}`),originalHealth=core.sourceHealth;core.sourceHealth=()=>({...originalHealth(),mode:'google-error',label:'GOOGLE ERROR',auth:'service-account'});cache={core,expiresAt:now+5000,mode:'google-error'};return core;}
  }
  const warning=privateSource?.__error?`Private source parse error: ${privateSource.__error}`:'Google Sheets bridge credentials are not configured.';const core=buildReference(warning);cache={core,expiresAt:now+5000,mode:'reference-snapshot'};return core;
}
module.exports={getCore};
