export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'method_not_allowed'});
  const token=process.env.HF_REAL_READ_TOKEN||'';
  if(!token) return res.status(503).json({ok:false,error:'not_configured'});
  const ids=[
    'AKfycby9fZsSvnDH-vHw8meOREyscielybVQleoTYN70FEUha0dB_xJORD-hwvOzDb4qyvbT',
    'AKfycby9fZsSvnDH-vHw8meOREyscielybVQleoTYN7OFEUha0dB_xJORD-hwvOzDb4qyvbT'
  ];
  try{
    for(const id of ids){
      const u=new URL('https://script.google.com/macros/s/'+id+'/exec'); u.searchParams.set('token',token);
      const upstream=await fetch(u.toString(),{method:'GET',headers:{'Accept':'application/json'},cache:'no-store',redirect:'follow'});
      const text=await upstream.text();
      let data=null; try{data=JSON.parse(text)}catch{}
      if(data&&data.ok===true) return res.status(200).json({ok:true,schema:String(data.schema||''),count:Array.isArray(data.currentStatus)?data.currentStatus.length:null,candidateDeploymentId:id});
    }
    return res.status(502).json({ok:false,error:'no_candidate_matched'});
  }catch(e){return res.status(502).json({ok:false,error:String(e&&e.message?e.message:e)});}
}
