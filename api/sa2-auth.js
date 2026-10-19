import crypto from 'node:crypto';
async function memberCall(body){return (await import('../lib/member-auth.mjs')).memberCall(body);}
async function memberAuthenticate(body){return (await import('../lib/member-auth.mjs')).memberAuthenticate(body);}
async function memberMode(){if(!process.env.HF_REAL_READ_TOKEN)return false;try{return (await memberCall({action:'status'})).enabled===true;}catch(e){if(e.message==='unsupported_operation')return false;throw e;}}


const PIN_SALT='lJRTC5NU6xH9XhPZDUewlA';
const PIN_HASH='BH_vzmRjgAljPZiEz4f7vroGaegZdb-F8ExdqfaGbsk';
const WINDOW_MS=10*60*1000;
const MAX_FAILS=5;
const attempts=globalThis.__hfSa2Attempts||(globalThis.__hfSa2Attempts=new Map());

function validPin(pin){
  if(!/^[0-9]{4}$/.test(String(pin)))return false;
  const salt=Buffer.from(PIN_SALT,'base64url');
  const expected=Buffer.from(PIN_HASH,'base64url');
  const actual=crypto.scryptSync(String(pin),salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);
}
function clientKey(req){const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();const name=String(req.body?.name||'').trim();return ip+'|'+crypto.createHash('sha256').update(name).digest('hex').slice(0,16);}
function blocked(req){
  const key=clientKey(req),row=attempts.get(key);
  if(!row)return false;
  if(Date.now()-row.since>WINDOW_MS){attempts.delete(key);return false;}
  return row.count>=MAX_FAILS;
}
function failed(req){
  const key=clientKey(req),now=Date.now(),row=attempts.get(key);
  if(!row||now-row.since>WINDOW_MS)attempts.set(key,{count:1,since:now});
  else attempts.set(key,{count:row.count+1,since:row.since});
}
function clearFailures(req){attempts.delete(clientKey(req));}

export default async function handler(req,res){
 const {reply}=await import('../lib/kmt-server.mjs'),{sameOrigin}=await import('../lib/person-auth.mjs'),{sa2Person,sa2Cookie,clearSa2Cookie}=await import('../lib/sa2-auth.mjs');
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method==='GET'){
  if(!process.env.HF_REAL_APP_KEY)return reply(res,503,{ok:false,error:'not_configured'});
  try{const enabled=await memberMode(),p=sa2Person(req);
   if(p?.member){const d=await memberCall({action:'check',member:p.member});return reply(res,200,{ok:true,memberEnabled:enabled,user:{label:d.member.name,role:d.member.role,team:d.member.team,memberId:d.member.id,auth:'member'}});}
   return reply(res,200,{ok:true,memberEnabled:enabled,migrationRequired:enabled&&!!p,user:p?{label:p.label||'',role:enabled?'reader':'writer',auth:'legacy'}:null});
  }catch(e){if(/member_denied|member_session_revoked|registration_required/.test(e.message)){res.setHeader('Set-Cookie',clearSa2Cookie());return reply(res,200,{ok:true,memberEnabled:true,user:null});}return reply(res,503,{ok:false,error:'auth_unavailable'});}
 }
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 const action=String(req.body?.action||'');
 if(action==='logout'){res.setHeader('Set-Cookie',clearSa2Cookie());return reply(res,200,{ok:true});}
 if(!process.env.HF_REAL_APP_KEY)return reply(res,503,{ok:false,error:'not_configured'});
 if(blocked(req))return reply(res,429,{ok:false,error:'too_many_attempts'});
 if(['member-login','enroll'].includes(action)){
  try{const profile=await memberAuthenticate({...req.body,action:action==='enroll'?'enroll':'login'});clearFailures(req);res.setHeader('Set-Cookie',sa2Cookie({sub:'member-'+profile.id,email:'MEMBER:'+profile.id,label:profile.name,member:{id:profile.id,version:profile.version}}));return reply(res,200,{ok:true,user:{label:profile.name,role:profile.role,team:profile.team,memberId:profile.id,auth:'member'}});}
  catch(e){failed(req);const known=/^(member_denied|member_locked|invalid_member_input|pin_confirmation_mismatch|member_auth_not_ready|already_registered)$/;return reply(res,e.message==='member_locked'?429:known.test(e.message)?401:503,{ok:false,error:known.test(e.message)?e.message:'auth_unavailable'});}
 }
 if(action!=='activate')return reply(res,400,{ok:false,error:'invalid_request'});
 try{if(await memberMode())return reply(res,401,{ok:false,error:'registration_required'});}catch{return reply(res,503,{ok:false,error:'auth_unavailable'});}
 const name=String(req.body?.name||'').replace(/[\r\n\t]/g,' ').trim().slice(0,30),pin=String(req.body?.pin||'');
 if(!name)return reply(res,400,{ok:false,error:'invalid_name'});
 if(!validPin(pin)){failed(req);return reply(res,401,{ok:false,error:'pin_denied'});}clearFailures(req);
 const sub='sa2-'+crypto.createHash('sha256').update(name).digest('hex').slice(0,24);res.setHeader('Set-Cookie',sa2Cookie({sub,email:'SA2:'+name,label:name}));return reply(res,200,{ok:true,user:{label:name,role:'writer',auth:'sa2'},expiresInDays:180});
}
