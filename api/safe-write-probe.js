export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'method_not_allowed'});

  const base=process.env.HF_REAL_READ_URL||'';
  const token=process.env.HF_REAL_READ_TOKEN||'';
  if(!base||!token) return res.status(503).json({ok:false,error:'not_configured'});
  const baseDeploymentId=(()=>{try{return new URL(base).pathname.match(/\/macros\/s\/([^/]+)/)?.[1]||''}catch{return''}})();

  const payload={
    token,
    op:'safe_write',
    text:'2026-09-14 테스트입력 GROW-E2E-SAFE-WRITE-20260915-0848',
    source:'GROW_E2E_PROBE',
    requester:'Grow',
    targetHint:'SAFE_WRITE_E2E_EXCLUDED'
  };

  try{
    const upstream=await fetch(base,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload),
      cache:'no-store',
      redirect:'follow'
    });
    const text=await upstream.text();
    let data=null; try{data=JSON.parse(text)}catch{}

    if(!data){
      const decoded=String(text||'')
        .replace(/<script[\s\S]*?<\/script>/gi,' ')
        .replace(/<style[\s\S]*?<\/style>/gi,' ')
        .replace(/<[^>]+>/g,' ')
        .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
        .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
        .replace(/\s+/g,' ').trim();
      const candidates=[/Script function not found[^.]*\.?/i,/ReferenceError:[^.]*\.?/i,/TypeError:[^.]*\.?/i,/Exception:[^.]*\.?/i,/Error:[^.]*\.?/i,/Authorization[^.]*\.?/i,/access[^.]*denied[^.]*\.?/i];
      let detail=''; for(const re of candidates){const m=re.exec(decoded);if(m){detail=m[0];break;}}
      return res.status(502).json({
        ok:false,
        error:'upstream_invalid_json',
        upstreamStatus:upstream.status,
        contentType:String(upstream.headers.get('content-type')||''),
        finalHost:(()=>{try{return new URL(upstream.url).host}catch{return''}})(),
        baseDeploymentId,
        detail:detail||decoded.slice(0,900)
      });
    }

    return res.status(data.ok===true?200:502).json({
      ok:data.ok===true,
      schema:String(data.schema||''),
      applied:!!data.applied,
      status:String(data.status||''),
      requestId:String(data.requestId||''),
      matchedIssueId:String(data.matchedIssueId||''),
      orderId:String(data.orderId||''),
      ack:String(data.ack||''),
      error:String(data.error||''),
      baseDeploymentId
    });
  }catch(e){
    return res.status(502).json({ok:false,error:String(e&&e.message?e.message:e),baseDeploymentId});
  }
}
