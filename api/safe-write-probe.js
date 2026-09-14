export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'method_not_allowed'});
  const token=process.env.HF_REAL_READ_TOKEN||'';
  if(!token) return res.status(503).json({ok:false,error:'not_configured'});
  const candidate='https://script.google.com/macros/s/AKfycby9fZsSvnDH-vHw8meOREyscielybVQleoTYN70FEUha0dB_xJORD-hwvOzDb4qyvbT/exec';
  try{
    const u=new URL(candidate); u.searchParams.set('token',token);
    const upstream=await fetch(u.toString(),{method:'GET',headers:{'Accept':'application/json'},cache:'no-store',redirect:'follow'});
    const text=await upstream.text();
    let data=null; try{data=JSON.parse(text)}catch{}
    if(!data) return res.status(502).json({ok:false,error:'candidate_invalid_json',upstreamStatus:upstream.status,detail:String(text||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,300)});
    return res.status(data.ok===true?200:502).json({ok:data.ok===true,error:String(data.error||''),schema:String(data.schema||''),count:Array.isArray(data.currentStatus)?data.currentStatus.length:null,candidateDeploymentId:'AKfycby9fZsSvnDH-vHw8meOREyscielybVQleoTYN70FEUha0dB_xJORD-hwvOzDb4qyvbT'});
  }catch(e){return res.status(502).json({ok:false,error:String(e&&e.message?e.message:e)});}
}
