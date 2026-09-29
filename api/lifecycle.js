import crypto from 'node:crypto';
export default async function handler(req,res){
 const {sameOrigin}=await import('../lib/person-auth.mjs');
 const {reply,upstream}=await import('../lib/kmt-server.mjs');
 const {authUser}=await import('../lib/auth-user.mjs');
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 const p=authUser(req);if(!p)return reply(res,401,{ok:false,error:'activation_required'});
 const role=p.role;
 const b=req.body||{};
 if(!['plans','edit','receipt'].includes(b.action)||typeof b.orderId!=='string'||!b.orderId.trim()||b.orderId.length>100)return reply(res,400,{ok:false,error:'invalid_request'});
 if(b.action==='edit'&&!['owner','writer'].includes(role))return reply(res,403,{ok:false,error:'forbidden'});
 const payload={action:b.action,orderId:b.orderId,actor:{sub:p.sub,email:p.email,exp:Math.min(p.exp,Math.floor(Date.now()/1000)+120)}};
 for(const key of ['key','expected','date','reason','requestId']){
  if(b[key]!==undefined&&(typeof b[key]!=='string'||b[key].length>1000))return reply(res,400,{ok:false,error:'invalid_request'});
  if(b[key]!==undefined)payload[key]=b[key];
 }
 if(!process.env.HF_REAL_READ_TOKEN)return reply(res,503,{ok:false,error:'not_configured'});
 const signed=JSON.stringify(payload),signature=crypto.createHmac('sha256',process.env.HF_REAL_READ_TOKEN).update(signed).digest('base64url');
 try{return reply(res,200,await upstream({op:'light_schedule',signed,signature}));}
 catch(e){
  const known=/^(forbidden|busy|invalid_request_id|invalid_project_id|invalid_reason|invalid_date|no_change|source_mismatch|destination_occupied|formula_cell|stale_record|project_mismatch|ambiguous_record|ambiguous_receipt|target_missing|monthly_project_missing|outside_edit_month|request_conflict|edit_gate_closed|pending_verification|schedule_write_failed)$/;
  const error=known.test(e.message)?e.message:'schedule_unavailable';
  return reply(res,error==='forbidden'?403:/stale|conflict|occupied|ambiguous|mismatch/.test(error)?409:502,{ok:false,error,requestId:payload.requestId||''});
 }
}
