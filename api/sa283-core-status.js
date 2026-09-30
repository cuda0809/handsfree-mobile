import crypto from 'node:crypto';

async function legacyRead(){
  const base=process.env.HF_REAL_READ_URL||'';
  const token=process.env.HF_REAL_READ_TOKEN||'';
  if(!base||!token)return null;
  const u=new URL(base);
  u.searchParams.set('token',token);
  const r=await fetch(u.toString(),{method:'GET',headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(20000)});
  let d=null;
  try{d=await r.json();}catch{}
  return r.ok&&d?.ok===true?d:null;
}

async function appCall(upstream,secret,actor,action,extra={}){
  const now=Math.floor(Date.now()/1000);
  const exp=Number.isFinite(Number(actor.exp))?Math.min(Number(actor.exp),now+120):now+120;
  const payload={action,actor:{sub:String(actor.sub||''),email:String(actor.email||''),exp},...extra};
  const signed=JSON.stringify(payload);
  const signature=crypto.createHmac('sha256',secret).update(signed).digest('base64url');
  return upstream({op:'light_app',signed,signature});
}

function legacyMap(data){
  return new Map((Array.isArray(data?.currentStatus)?data.currentStatus:[]).map(x=>[String(x.issueId||''),x]));
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'method_not_allowed'});

  const {authUser}=await import('../lib/sa2-auth-user.mjs');
  const {upstream}=await import('../lib/kmt-server.mjs');
  const user=authUser(req);
  if(!user)return res.status(401).json({ok:false,live:false,error:'activation_required'});
  const secret=process.env.HF_REAL_READ_TOKEN||'';
  if(!secret)return res.status(503).json({ok:false,live:false,error:'not_configured'});

  try{
    const [catalog,legacy]=await Promise.all([
      appCall(upstream,secret,user,'catalog'),
      legacyRead().catch(()=>null)
    ]);
    const active=(Array.isArray(catalog.issues)?catalog.issues:[])
      .filter(x=>x?.issueId&&/^(OPEN|MONITOR)$/.test(String(x.status||'')));

    const snapshots=await Promise.all(active.map(x=>appCall(upstream,secret,user,'issue',{issueId:String(x.issueId)})));
    const old=legacyMap(legacy);
    const currentStatus=snapshots.map(s=>{
      const prior=old.get(String(s.issueId||''))||{};
      const state=String(s.state||'확인중');
      const nextAction=String(s.nextAction||'');
      const priority=Number(prior.priority)||(/지연|대기|문제|불량|점검/.test(state+' '+nextAction)?1:2);
      return {
        issueId:String(s.issueId||''),
        orderId:String(s.orderId||''),
        customer:String(s.customer||prior.customer||''),
        model:String(s.model||prior.model||''),
        process:String(prior.process||'현재상태'),
        state,
        since:String(prior.since||''),
        days:Number(prior.days||0),
        cause:String(prior.cause||''),
        nextAction,
        tone:String(prior.tone||'warn'),
        priority,
        issueStatus:String(s.status||''),
        type:String(prior.type||''),
        sourceLatestUpdate:String(prior.sourceLatestUpdate||'')
      };
    });

    const mismatches=currentStatus.flatMap(x=>{
      const p=old.get(x.issueId);
      if(!p)return [];
      const fields=[];
      if(String(p.state||'')!==x.state)fields.push('state');
      if(String(p.nextAction||'')!==x.nextAction)fields.push('nextAction');
      if(String(p.issueStatus||'')!==x.issueStatus)fields.push('issueStatus');
      return fields.length?[{issueId:x.issueId,orderId:x.orderId,fields}]:[];
    });

    return res.status(200).json({
      ok:true,
      live:true,
      coreRead:true,
      schema:'HF_SA283_CORE_OVERLAY_V1',
      timezone:String(legacy?.timezone||'Asia/Seoul'),
      today:String(legacy?.today||''),
      generatedAt:new Date().toISOString(),
      sourceLatestDate:String(legacy?.sourceLatestDate||''),
      currentStatus,
      counts:{currentStatus:currentStatus.length},
      diagnostics:{
        coreIssues:active.length,
        legacyMatched:currentStatus.filter(x=>old.has(x.issueId)).length,
        mismatches
      }
    });
  }catch(err){
    console.error('[sa283-core-status]',String(err?.message||err));
    return res.status(502).json({ok:false,live:false,error:'core_read_unavailable'});
  }
}
