// Read only: never forward an operation chosen by the caller.
export default async function handler(req,res){
  const {reply,upstream}=await import('../lib/kmt-server.mjs');
  const {authUser}=await import('../lib/auth-user.mjs');
  if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
  const actor=authUser(req);
  if(!actor)return reply(res,401,{ok:false,error:'activation_required'});
  const orderId=req.body?.orderId;
  if(typeof orderId!=='string'||!orderId.trim()||orderId.length>100)return reply(res,400,{ok:false,error:'invalid_project_id'});
  try{
    const d=await upstream({op:'kmt_read'});
    if(!Array.isArray(d.plans)||!d.plans.every(Array.isArray))throw Error('invalid_plans');
    const plans=d.plans.slice(1).filter(r=>r[4]===orderId);
    const counts=new Map();
    for(const row of plans)counts.set(row[0],(counts.get(row[0])||0)+1);
    const duplicateRecordIds=[...counts].filter(([id,count])=>id&&count>1).map(([id])=>id);
    return reply(res,200,{ok:true,orderId,plans,duplicateRecordIds,editingAvailable:false,editingBlockedReason:'schedule_source_unverified'});
  }catch{return reply(res,502,{ok:false,error:'plans_unavailable'});}
}
