import crypto from 'node:crypto';
export default async function handler(req,res){
 const {sameOrigin}=await import('../lib/person-auth.mjs');
 const {authUser}=await import('../lib/sa2-auth-user.mjs');
 const {reply,upstream}=await import('../lib/kmt-server.mjs');
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 const p=authUser(req);if(!p)return reply(res,401,{ok:false,error:'activation_required'});
 const role=p.role;
 const b=req.body||{};if(!['core','plans','catalog','reports','history','receipt','issue','edit'].includes(b.action))return reply(res,400,{ok:false,error:'invalid_request'});
 if(b.action==='edit'&&!['owner','writer'].includes(role))return reply(res,403,{ok:false,error:'forbidden'});
 const payload={action:b.action,actor:{sub:p.sub,email:p.email,exp:Math.min(p.exp,Math.floor(Date.now()/1000)+120)}};
 for(const key of ['orderId','issueId','expected','state','nextAction','status','reason','requestId','submissionId','text','targetHint']){
  if(b[key]!==undefined&&(typeof b[key]!=='string'||b[key].length>1000))return reply(res,400,{ok:false,error:'invalid_request'});
  if(b[key]!==undefined)payload[key]=b[key];
 }
 if(!process.env.HF_REAL_READ_TOKEN)return reply(res,503,{ok:false,error:'not_configured'});
 const signed=JSON.stringify(payload),signature=crypto.createHmac('sha256',process.env.HF_REAL_READ_TOKEN).update(signed).digest('base64url');
 try{return reply(res,200,await upstream({op:'light_app',signed,signature}));}
 catch(e){
  const transport=/^(ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_SOCKET)$/.test(e.cause?.code||'')?e.cause.code:'';
  const diagnostic=transport||(/^(not_configured|upstream_invalid_json|upstream_failed|invalid_source_month|forbidden|busy|unsupported_operation)$/.test(e.message)?e.message:e.name==='TimeoutError'||e.name==='AbortError'?'upstream_timeout':'upstream_unavailable');
  console.warn('HF_APP_READ_FAILED',b.action,diagnostic);
  if(b.action==='core'&&e.message==='unsupported_operation'){
   return reply(res,502,{ok:false,error:'core_not_supported'});
  }
  const known=/^(forbidden|busy|target_missing|ambiguous_record|ambiguous_receipt|stale_record|project_mismatch|invalid_request_id|invalid_reason|invalid_state|invalid_status|invalid_next_action|request_conflict|no_change|formula_cell|edit_gate_closed|pending_verification|schedule_write_failed|unsupported_operation)$/;
 const error=known.test(e.message)?e.message:'app_unavailable';return reply(res,error==='forbidden'?403:/stale|conflict|ambiguous|mismatch/.test(error)?409:502,{ok:false,error,reason:diagnostic,requestId:payload.requestId||''});}
}
