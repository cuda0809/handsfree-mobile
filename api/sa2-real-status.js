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
  const raw=String(req.headers.cookie||''),out={};
  for(const part of raw.split(';')){
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
  if(!Number.isFinite(exp)||exp<=Math.floor(Date.now()/1000))return false;
  return safeEqual(m[2],sign(exp,appKey));
}
async function legacyRead(base,token){
  const u=new URL(base);
  u.searchParams.set('token',token);
  const r=await fetch(u.toString(),{method:'GET',headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(20000)});
  let d=null;try{d=await r.json();}catch{}
  if(!r.ok||!d||d.ok!==true)return null;
  return d;
}
function mapLegacy(data){
  const currentStatus=Array.isArray(data?.currentStatus)?data.currentStatus.map(x=>({
    issueId:String(x.issueId||''),orderId:String(x.orderId||''),customer:String(x.customer||''),
    model:String(x.model||''),process:String(x.process||''),state:String(x.state||'확인중'),
    since:String(x.since||''),days:Number(x.days||0),cause:String(x.cause||''),
    nextAction:String(x.nextAction||''),tone:String(x.tone||'warn'),priority:Number(x.priority||2),
    issueStatus:String(x.issueStatus||''),type:String(x.type||''),sourceLatestUpdate:String(x.sourceLatestUpdate||'')
  })): [];
  return {
    ok:true,live:true,coreRead:false,schema:String(data?.schema||'HF_REAL'),
    timezone:String(data?.timezone||'Asia/Seoul'),today:String(data?.today||''),
    generatedAt:String(data?.generatedAt||''),sourceLatestDate:String(data?.sourceLatestDate||''),
    currentStatus,counts:data?.counts||{currentStatus:currentStatus.length}
  };
}
async function appCall(upstream,secret,actor,action,extra={}){
  const now=Math.floor(Date.now()/1000);
  const exp=Number.isFinite(Number(actor.exp))?Math.min(Number(actor.exp),now+120):now+120;
  const payload={action,actor:{sub:String(actor.sub||''),email:String(actor.email||''),exp},...extra};
  const signed=JSON.stringify(payload);
  const signature=crypto.createHmac('sha256',secret).update(signed).digest('base64url');
  return upstream({op:'light_app',signed,signature});
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET')return res.status(405).json({ok:false,live:false,error:'method_not_allowed'});

  const base=process.env.HF_REAL_READ_URL||'',token=process.env.HF_REAL_READ_TOKEN||'',appKey=process.env.HF_REAL_APP_KEY||'';
  if(!base||!token||!appKey)return res.status(503).json({ok:false,live:false,error:'not_configured'});

  const {authUser}=await import('../lib/sa2-auth-user.mjs');
  const {upstream}=await import('../lib/kmt-server.mjs');
  const user=authUser(req);
  const suppliedKey=String(req.headers['x-hf-app-key']||'');
  const legacyAuthorized=validSession(req,appKey)||(!!suppliedKey&&safeEqual(suppliedKey,appKey));
  if(!user&&!legacyAuthorized)return res.status(401).json({ok:false,live:false,error:'unauthorized_app'});

  try{
    const legacy=await legacyRead(base,token);
    if(!user){
      if(!legacy)return res.status(502).json({ok:false,live:false,error:'legacy_read_unavailable'});
      return res.status(200).json(mapLegacy(legacy));
    }

    // Keep the live read cheap: one catalog read + one REAL read.
    // Do not fan out one signed Apps Script request per active issue.
    const catalog=await appCall(upstream,token,user,'catalog');
    const projects=Array.isArray(catalog.projects)?catalog.projects:[];
    const projectFor=orderId=>{
      const id=String(orderId||'');
      const exact=projects.find(p=>String(p.orderId||'')===id);
      if(exact)return exact;
      const prefix=id.includes('*')?id.replace(/\*.*$/,''):id;
      return projects.find(p=>String(p.orderId||'').startsWith(prefix))||null;
    };
    const legacyByIssue=new Map((Array.isArray(legacy?.currentStatus)?legacy.currentStatus:[]).map(x=>[String(x.issueId||''),x]));
    const active=(Array.isArray(catalog.issues)?catalog.issues:[])
      .filter(x=>{
        if(!x?.issueId)return false;
        const st=String(x.status||'');
        if(st==='OPEN')return true;
        if(st!=='MONITOR')return false;
        // Historical MONITOR rows remain in the ledger, but blank current state means
        // they are not part of the live board.
        return !!String(x.state||'').trim();
      });
    const parseDue=value=>{
      const s=String(value||'').trim();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
      const t=Date.parse(s+'T00:00:00+09:00');
      return Number.isFinite(t)?t:null;
    };
    const priorityFor=(s,state,nextAction)=>{
      if(/^(출고완료|납품완료|완료)$/.test(state))return {priority:3,reason:'완료 상태'};
      const text=state+' '+nextAction;
      if(/불량|문제|고장|지연|점검|재작업|수정중|에러|오류|멈춤/.test(text))return {priority:1,reason:'문제·점검 필요'};
      const project=projectFor(s.orderId),due=parseDue(project?.due);
      if(/대기|보류/.test(text)&&due!==null&&due<Date.now())return {priority:1,reason:'납기 경과 대기'};
      if(/대기|보류/.test(text))return {priority:2,reason:'일반 대기'};
      return {priority:2,reason:'정상 진행'};
    };

    const currentStatus=active.map(s=>{
      const prior=legacyByIssue.get(String(s.issueId||''))||{};
      const project=projectFor(s.orderId)||{};
      const state=String(s.state||prior.state||'확인중');
      const nextAction=String(prior.nextAction||'');
      const ranked=priorityFor(s,state,nextAction);
      return {
        issueId:String(s.issueId||''),orderId:String(s.orderId||''),customer:String(prior.customer||project.customer||''),
        model:String(prior.model||project.model||''),process:String(prior.process||'현재상태'),state,
        since:String(prior.since||''),days:Number(prior.days||0),cause:String(prior.cause||''),
        nextAction,tone:String(prior.tone||'warn'),priority:ranked.priority,priorityReason:ranked.reason,issueStatus:String(s.status||''),
        type:String(prior.type||''),sourceLatestUpdate:String(prior.sourceLatestUpdate||legacy?.sourceLatestDate||'')
      };
    });
    const mismatches=currentStatus.flatMap(x=>{
      const p=legacyByIssue.get(x.issueId);if(!p)return [];
      const fields=[];
      if(String(p.state||'')!==x.state)fields.push('state');
      if(String(p.nextAction||'')!==x.nextAction)fields.push('nextAction');
      if(String(p.issueStatus||'')!==x.issueStatus)fields.push('issueStatus');
      return fields.length?[{issueId:x.issueId,orderId:x.orderId,fields}]:[];
    });

    return res.status(200).json({
      ok:true,live:true,coreRead:true,personalConnected:true,schema:'HF_SA283_CORE_OVERLAY_V1',
      timezone:String(legacy?.timezone||'Asia/Seoul'),today:String(legacy?.today||''),
      generatedAt:new Date().toISOString(),sourceLatestDate:String(legacy?.sourceLatestDate||''),
      currentStatus,counts:{currentStatus:currentStatus.length},
      diagnostics:{coreIssues:active.length,candidateIssues:active.length,legacyMatched:currentStatus.filter(x=>legacyByIssue.has(x.issueId)).length,mismatches,fanoutIssueReads:0}
    });
  }catch(err){
    console.error('[sa2-real-status-core]',String(err?.message||err));
    return res.status(502).json({ok:false,live:false,error:'core_read_unavailable'});
  }
}
