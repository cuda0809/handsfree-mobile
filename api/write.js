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
  const raw=String(req.headers.cookie||'');
  const out={};
  for(const part of raw.split(';')){
    const i=part.indexOf('=');
    if(i<0)continue;
    const k=part.slice(0,i).trim();
    const v=part.slice(i+1).trim();
    if(k)out[k]=v;
  }
  return out;
}
function validSession(req,appKey){
  const raw=parseCookies(req)[COOKIE]||'';
  const m=/^(\d+)\.([a-f0-9]{64})$/i.exec(raw);
  if(!m)return false;
  const exp=Number(m[1]);
  if(!Number.isFinite(exp)||exp<=Math.floor(Date.now()/1000))return false;
  return safeEqual(m[2],sign(exp,appKey));
}
function clean(v,n){ return String(v??'').trim().slice(0,n); }

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'method_not_allowed'});

  const base=process.env.HF_REAL_READ_URL||'';
  const token=process.env.HF_REAL_READ_TOKEN||'';
  const appKey=process.env.HF_REAL_APP_KEY||'';
  if(!base||!token||!appKey) return res.status(503).json({ok:false,error:'not_configured'});

  const suppliedKey=String(req.headers['x-hf-app-key']||'');
  const authorized=validSession(req,appKey)||(!!suppliedKey&&safeEqual(suppliedKey,appKey));
  if(!authorized) return res.status(401).json({ok:false,error:'unauthorized_app'});

  const body=req.body&&typeof req.body==='object'?req.body:{};
  const text=clean(body.text,1000);
  if(!text) return res.status(400).json({ok:false,error:'empty_text'});

  const payload={
    token,
    op:'safe_write',
    text,
    source:clean(body.source||'MOBILE',40),
    requester:clean(body.requester||'Emotion',80),
    targetHint:clean(body.targetHint||'',200)
  };

  try{
    const upstream=await fetch(base,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload),
      cache:'no-store'
    });
    const txt=await upstream.text();
    let data={};
    try{ data=JSON.parse(txt); }catch{ return res.status(502).json({ok:false,error:'upstream_invalid_json'}); }

    // Apps Script ContentService commonly returns 200 even for application-level errors.
    if(!upstream.ok) return res.status(502).json({ok:false,error:`upstream_${upstream.status}`});
    if(!data||data.ok!==true){
      const err=String(data?.error||'safe_write_not_ready');
      const notReady=/unsupported_operation|safe_write_not_ready|unauthorized/.test(err);
      return res.status(notReady?503:422).json({ok:false,error:err,ack:String(data?.ack||'')});
    }

    return res.status(200).json({
      ok:true,
      applied:!!data.applied,
      status:String(data.status||''),
      requestId:String(data.requestId||''),
      matchedIssueId:String(data.matchedIssueId||''),
      orderId:String(data.orderId||''),
      changes:data.changes||{},
      before:data.before||null,
      after:data.after||null,
      ack:String(data.ack||'')
    });
  }catch(err){
    return res.status(502).json({ok:false,error:String(err&&err.message?err.message:err)});
  }
}
