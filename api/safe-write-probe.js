export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'method_not_allowed'});
  const base=process.env.HF_REAL_READ_URL||'';
  const token=process.env.HF_REAL_READ_TOKEN||'';
  if(!base||!token) return res.status(503).json({ok:false,error:'not_configured'});
  const payload={token,op:'safe_write',text:'2026-09-14 미코 KDM-150 REAL 0.8 서버 왕복 안전 테스트',source:'SERVER_SAFE_PROBE',requester:'Grow',targetHint:'미코 KDM-150'};
  try{
    const upstream=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
    const text=await upstream.text();
    let data={}; try{data=JSON.parse(text)}catch{return res.status(502).json({ok:false,error:'upstream_invalid_json',status:upstream.status})}
    return res.status(data&&data.ok===true?200:502).json({ok:data?.ok===true,status:String(data?.status||''),applied:!!data?.applied,requestId:String(data?.requestId||''),ack:String(data?.ack||''),error:String(data?.error||'')});
  }catch(e){return res.status(502).json({ok:false,error:String(e&&e.message?e.message:e)});}
}
