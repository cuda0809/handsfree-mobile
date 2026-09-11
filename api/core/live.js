// HandsFree Mobile REAL 0.7 — strict LIVE READ gate.
const {getCore}=require('../../core/provider');
function envPresence(){return{
  appsScriptUrl:Boolean(process.env.HF_APPS_SCRIPT_URL),
  appsScriptToken:Boolean(process.env.HF_APPS_SCRIPT_TOKEN),
  spreadsheetId:Boolean(process.env.HF_OS_V3_SPREADSHEET_ID),
  serviceAccount:Boolean(process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON_B64||process.env.HF_GOOGLE_SERVICE_ACCOUNT_JSON||(process.env.HF_GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.HF_GOOGLE_PRIVATE_KEY))
};}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
    const core=await getCore({force:true});const source=core.sourceHealth();
    const auth=String(source?.auth||'');
    const liveReady=Boolean(source?.runtimeLiveRead===true&&['apps-script-token','service-account'].includes(auth)&&/OS v3 LIVE/i.test(String(source?.label||'')));
    const payload={ok:liveReady,liveReady,mode:source?.mode||null,label:source?.label||null,auth:source?.auth||null,runtimeLiveRead:Boolean(source?.runtimeLiveRead),runtimeDirectGoogleRead:Boolean(source?.runtimeDirectGoogleRead),fetchedAt:source?.fetchedAt||null,warning:source?.warning||null,env:envPresence(),writeLocked:true};
    if(!liveReady)return res.status(503).json({...payload,code:'REAL_LIVE_READ_NOT_READY',message:'OS v3 LIVE READ is not active. Snapshot/reference fallbacks are not accepted as LIVE.'});
    return res.status(200).json({...payload,code:'REAL_LIVE_READ_READY',message:'Authenticated OS v3 LIVE READ is active.'});
  }catch(error){return res.status(500).json({ok:false,liveReady:false,code:'REAL_LIVE_READ_ERROR',message:error?.message||'LIVE READ check failed',env:envPresence(),writeLocked:true});}
};
