import crypto from 'node:crypto';
import {sameOrigin} from '../lib/person-auth.mjs';
import {authUser} from '../lib/sa2-auth-user.mjs';
import {reply,upstream} from '../lib/kmt-server.mjs';
export const config={api:{bodyParser:{sizeLimit:'2mb'}}};
export default async function handler(req,res){
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 const actor=authUser(req);if(!actor)return reply(res,401,{ok:false,error:'activation_required'});
 const b=req.body||{},actions=['media-list','media-get','media-save','media-receipt'];
 if(!actions.includes(b.action))return reply(res,400,{ok:false,error:'invalid_action'});
 if(b.action==='media-save'&&!['owner','writer'].includes(actor.role))return reply(res,403,{ok:false,error:'forbidden'});
 const p={action:b.action,actor:{sub:actor.sub,email:actor.email,exp:Math.min(actor.exp,Math.floor(Date.now()/1000)+120)}};
 for(const [key,max] of [['orderId',100],['requestId',80],['issueId',80],['issueTitle',80],['memo',1000],['takenAt',40]]){
  if(b[key]!==undefined&&(typeof b[key]!=='string'||b[key].length>max))return reply(res,400,{ok:false,error:'invalid_request'});
  if(b[key]!==undefined)p[key]=b[key].trim();
 }
 if(!p.orderId)return reply(res,400,{ok:false,error:'missing_target'});
 if(b.action==='media-save'){
  if(b.resume!==undefined&&typeof b.resume!=='boolean')return reply(res,400,{ok:false,error:'invalid_request'});p.resume=b.resume===true;
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(p.requestId||'')||!/^PHI-[a-zA-Z0-9-]{16,70}$/.test(p.issueId||'')||!p.memo||!p.issueTitle)return reply(res,400,{ok:false,error:'invalid_metadata'});
  if(b.mime!=='image/jpeg'||typeof b.data!=='string'||b.data.length>1400000||!/^[A-Za-z0-9+/]+={0,2}$/.test(b.data))return reply(res,400,{ok:false,error:'invalid_photo'});
  const bytes=Buffer.from(b.data,'base64');if(bytes.length<4||bytes.length>1000000||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)return reply(res,400,{ok:false,error:'invalid_photo'});
  p.mime='image/jpeg';p.hash=crypto.createHash('sha256').update(bytes).digest('hex');
 }
 const token=process.env.HF_REAL_READ_TOKEN;if(!token)return reply(res,503,{ok:false,error:'not_configured'});
 const signed=JSON.stringify(p),signature=crypto.createHmac('sha256',token).update(signed).digest('base64url');
 try{return reply(res,200,await upstream({op:'light_media',signed,signature,...(b.action==='media-save'?{data:b.data}:{})},45000));}
 catch(e){const allowed=/^(media_not_ready|media_access_required|media_pending|media_missing|media_corrupt|request_conflict|forbidden|busy|invalid_photo|invalid_metadata|project_mismatch|safe_write_not_ready)$/;const error=allowed.test(e.message)?e.message:'media_unavailable';return reply(res,/conflict|pending/.test(error)?409:error==='forbidden'?403:502,{ok:false,error,requestId:p.requestId||''});}
}
