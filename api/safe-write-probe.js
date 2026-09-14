export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'method_not_allowed'});
  const token=process.env.HF_REAL_READ_TOKEN||'';
  if(!token) return res.status(503).json({ok:false,error:'not_configured'});
  const parts={
    q:['VQleo','VQ1eo'],
    t:['TYN70FE','TYN7OFE'],
    h:['Uha0dB','UhaOdB'],
    j:['_xJORD','_xJ0RD']
  };
  const ids=[];
  for(const q of parts.q)for(const t of parts.t)for(const h of parts.h)for(const j of parts.j){
    ids.push('AKfycby9fZsSvnDH-vHw8meOREyscielyb'+q+t+h+j+'-hwvOzDb4qyvbT');
  }
  try{
    const results=await Promise.all(ids.map(async id=>{
      try{
        const u=new URL('https://script.google.com/macros/s/'+id+'/exec'); u.searchParams.set('token',token);
        const upstream=await fetch(u.toString(),{method:'GET',headers:{'Accept':'application/json'},cache:'no-store',redirect:'follow'});
        const text=await upstream.text();
        let data=null; try{data=JSON.parse(text)}catch{}
        return {id,status:upstream.status,ok:!!(data&&data.ok===true),schema:String(data&&data.schema||'')};
      }catch(e){return {id,status:0,ok:false};}
    }));
    const hit=results.find(x=>x.ok);
    if(hit) return res.status(200).json({ok:true,candidateDeploymentId:hit.id,schema:hit.schema});
    return res.status(502).json({ok:false,error:'no_candidate_matched',statuses:results.map(x=>x.status)});
  }catch(e){return res.status(502).json({ok:false,error:String(e&&e.message?e.message:e)});}
}
