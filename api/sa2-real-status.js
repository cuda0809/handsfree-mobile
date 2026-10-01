import crypto from 'node:crypto';

const COOKIE='hf_real_session';

function safeEqual(a,b){
  const ha=crypto.createHash('sha256').update(String(a)).digest();
  const hb=crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha,hb);
}
function sign(exp,secret){
  return crypto.createHmac('sha256',secret).update(`hf-real:${exp}`).digest('hex');
}
function parseCookies(req){
  const out={};
  for(const part of String(req.headers.cookie||'').split(';')){
    const i=part.indexOf('=');
    if(i<0)continue;
    const k=part.slice(0,i).trim(),v=part.slice(i+1).trim();
    if(k)out[k]=v;
  }
  return out;
}
function validSession(req,appKey){
  const raw=parseCookies(req)[COOKIE]||'',m=/^(\d+)\.([a-f0-9]{64})$/i.exec(raw);
  if(!m)return false;
  const exp=Number(m[1]);
  return Number.isFinite(exp)&&exp>Math.floor(Date.now()/1000)&&safeEqual(m[2],sign(exp,appKey));
}
async function readOnce(base,token){
  const u=new URL(base);
  u.searchParams.set('token',token);
  const r=await fetch(u.toString(),{
    method:'GET',
    headers:{accept:'application/json'},
    cache:'no-store',
    signal:AbortSignal.timeout(18000)
  });
  const text=await r.text();
  let data=null;
  try{data=JSON.parse(text);}catch{}
  if(!r.ok||!data||data.ok!==true)throw Error(!data?'upstream_invalid_json':String(data.error||`upstream_${r.status}`));
  return data;
}
function normalize(x){
  return {
    issueId:String(x.issueId||''),
    orderId:String(x.orderId||''),
    customer:String(x.customer||''),
    model:String(x.model||''),
    process:String(x.process||''),
    state:String(x.state||'확인중'),
    since:String(x.since||''),
    days:Number(x.days||0),
    cause:String(x.cause||''),
    nextAction:String(x.nextAction||''),
    tone:String(x.tone||'warn'),
    priority:Number(x.priority||2),
    priorityReason:'',
    issueStatus:String(x.issueStatus||''),
    type:String(x.type||''),
    sourceLatestUpdate:String(x.sourceLatestUpdate||''),
    due:String(x.due||''),
    pm:String(x.pm||'')
  };
}
function isLiveItem(x){
  const status=String(x.issueStatus||'');
  const state=String(x.state||'').trim();
  const next=String(x.nextAction||'').trim();
  if(status==='OPEN')return true;
  if(status!=='MONITOR')return false;
  // Keep meaningful MONITOR rows, hide historical placeholders.
  return !!next || (state && state!=='확인중' && state!=='미등록');
}
function rank(x){
  const state=String(x.state||''),next=String(x.nextAction||''),text=state+' '+next;
  if(/^(출고완료|납품완료|완료)$/.test(state))return {priority:3,reason:'완료 상태'};
  if(/불량|문제|고장|지연|점검|재작업|수정중|에러|오류|멈춤|출고대기/.test(text))return {priority:1,reason:'문제·점검 또는 출고 확인'};
  if(/대기|보류/.test(text))return {priority:2,reason:'일반 대기'};
  return {priority:2,reason:'정상 진행'};
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET')return res.status(405).json({ok:false,live:false,error:'method_not_allowed'});

  const base=process.env.HF_REAL_READ_URL||'';
  const token=process.env.HF_REAL_READ_TOKEN||'';
  const appKey=process.env.HF_REAL_APP_KEY||'';
  if(!base||!token||!appKey)return res.status(503).json({ok:false,live:false,error:'not_configured'});

  const {authUser}=await import('../lib/sa2-auth-user.mjs');
  const user=authUser(req);
  const suppliedKey=String(req.headers['x-hf-app-key']||'');
  if(!user&&!validSession(req,appKey)&&!(suppliedKey&&safeEqual(suppliedKey,appKey))){
    return res.status(401).json({ok:false,live:false,error:'unauthorized_app'});
  }

  try{
    const data=await readOnce(base,token);
    const raw=Array.isArray(data.currentStatus)?data.currentStatus.map(normalize):[];
    const currentStatus=raw.filter(isLiveItem).map(x=>{
      const ranked=rank(x);
      return {...x,priority:ranked.priority,priorityReason:ranked.reason};
    });
    return res.status(200).json({
      ok:true,
      live:true,
      coreRead:true,
      schema:'HF_SA283_CORE_SINGLE_READ_V1',
      timezone:String(data.timezone||'Asia/Seoul'),
      today:String(data.today||''),
      generatedAt:String(data.generatedAt||new Date().toISOString()),
      sourceLatestDate:String(data.sourceLatestDate||''),
      currentStatus,
      counts:{currentStatus:currentStatus.length},
      diagnostics:{
        singleRead:true,
        rawItems:raw.length,
        liveItems:currentStatus.length,
        filteredItems:raw.length-currentStatus.length
      }
    });
  }catch(err){
    console.error('[sa2-real-status-single-read]',String(err&&err.message?err.message:err));
    return res.status(502).json({ok:false,live:false,error:'core_read_unavailable'});
  }
}
