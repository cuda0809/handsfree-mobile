function clean(v,n){ return String(v??'').trim().slice(0,n); }

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'method_not_allowed'});

  const base=process.env.HF_REAL_READ_URL||'';
  const token=process.env.HF_REAL_READ_TOKEN||'';
  const appKey=process.env.HF_REAL_APP_KEY||'';
  if(!base||!token||!appKey) return res.status(503).json({ok:false,error:'not_configured'});

  const {sameOrigin}=await import('../lib/person-auth.mjs');
  const {authUser}=await import('../lib/sa2-auth-user.mjs');
  if(!sameOrigin(req))return res.status(403).json({ok:false,error:'invalid_origin'});
  const actor=authUser(req);
  if(!actor)return res.status(401).json({ok:false,error:'activation_required'});
  if(!['owner','writer'].includes(actor.role))return res.status(403).json({ok:false,error:'forbidden'});

  const body=req.body&&typeof req.body==='object'?req.body:{};
  const text=clean(body.text,1000);
  if(!text) return res.status(400).json({ok:false,error:'empty_text'});
  if(body.submissionId!==undefined&&!/^[a-zA-Z0-9-]{16,80}$/.test(body.submissionId))return res.status(400).json({ok:false,error:'invalid_submission_id'});

  const payload={
    token,
    op:'safe_write',
    text,
    source:clean((body.source||'MOBILE')+(actor.sa2Label?'|SA2:'+actor.sa2Label:''),40),
    requester:actor.email,
    submissionId:body.submissionId||'',
    targetHint:clean(body.targetHint||'',200)
  };

  try{
    const upstream=await fetch(base,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload),
      cache:'no-store',
      signal:AbortSignal.timeout(45000)
    });
    const txt=await upstream.text();
    let data={};
    try{ data=JSON.parse(txt); }catch{ return res.status(502).json({ok:false,error:'upstream_invalid_json'}); }

    // Apps Script ContentService commonly returns 200 even for application-level errors.
    if(!upstream.ok) return res.status(502).json({ok:false,error:`upstream_${upstream.status}`});
    if(!data||data.ok!==true){
      const err=String(data?.error||'safe_write_not_ready');
      const notReady=/unsupported_operation|safe_write_not_ready|unauthorized/.test(err);
      return res.status(notReady?503:422).json({ok:false,error:err,requestId:String(data?.requestId||''),status:String(data?.status||''),ack:String(data?.ack||'')});
    }

    console.info('sa2-write-result',{status:String(data.status||''),applied:!!data.applied,requestId:String(data.requestId||'')});
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
    return res.status(502).json({ok:false,error:err?.name==='TimeoutError'?'upstream_timeout':'upstream_unavailable'});
  }
}
