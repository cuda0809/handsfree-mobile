import crypto from 'node:crypto';
async function memberCall(body){return (await import('../lib/member-auth.mjs')).memberCall(body);}
async function memberConfiguration(){if(!process.env.HF_REAL_READ_TOKEN)return {enabled:false};try{return await memberCall({action:'status'});}catch(e){if(e.message==='unsupported_operation')return {enabled:false};throw e;}}


const WINDOW_MS=10*60*1000;
const MAX_FAILS=5;
const attempts=globalThis.__hfSa2Attempts||(globalThis.__hfSa2Attempts=new Map());


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
  try{const config=await memberConfiguration(),enabled=config.enabled===true,ownerOnly=config.ownerOnly===true,p=sa2Person(req);
   if(p?.member){const d=await memberCall({action:'check',member:p.member});return reply(res,200,{ok:true,memberEnabled:enabled,memberOwnerOnly:ownerOnly,user:{label:d.member.name,role:d.member.role,isMaster:d.member.isMaster===true,team:d.member.team,memberId:d.member.id,auth:'member'}});}
   return reply(res,200,{ok:true,memberEnabled:enabled,memberOwnerOnly:ownerOnly,migrationRequired:enabled&&!ownerOnly&&!!p,user:p?{label:p.label||'',role:enabled&&!ownerOnly?'reader':'writer',auth:'legacy'}:null});
  }catch(e){if(/member_denied|member_session_revoked|registration_required/.test(e.message)){res.setHeader('Set-Cookie',clearSa2Cookie());return reply(res,200,{ok:true,memberEnabled:true,user:null});}return reply(res,503,{ok:false,error:'auth_unavailable'});}
 }
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 const action=String(req.body?.action||'');
 if(['activate','member-login','enroll'].includes(action))return reply(res,409,{ok:false,error:'account_login_required',loginUrl:'/kmt-sa2/account.html?manage=1'});
 if(action==='logout'){const {clearAdminCookie}=await import('../lib/admin-session.mjs');res.setHeader('Set-Cookie',[clearSa2Cookie(),clearAdminCookie()]);return reply(res,200,{ok:true});}
 if(!process.env.HF_REAL_APP_KEY)return reply(res,503,{ok:false,error:'not_configured'});
 if(action.startsWith('device-')){const {deviceHandler}=await import('../lib/master-device-handler.mjs');return deviceHandler({method:req.method,headers:req.headers,body:{...req.body,action:action.slice(7)}},res);}
 if(action.startsWith('admin-')){
  const person=sa2Person(req);if(!person?.member)return reply(res,401,{ok:false,error:'registration_required'});
  const {adminVerified}=await import('../lib/admin-session.mjs');if(!adminVerified(req,person.member))return reply(res,403,{ok:false,error:'admin_unlock_required'});
  try{const {memberAdmin}=await import('../lib/member-auth.mjs');return reply(res,200,await memberAdmin(person.member,req.body));}
  catch(e){const known=/^(master_required|owner_protected|member_session_revoked|member_denied|registration_required|stale_record|invitation_required|invalid_permissions|invalid_invitation|invalid_request)$/;return reply(res,known.test(e.message)?403:503,{ok:false,error:known.test(e.message)?e.message:'auth_unavailable'});}
 }
 if(blocked(req))return reply(res,429,{ok:false,error:'too_many_attempts'});
 if(action.startsWith('account-')){
  try{
   const person=sa2Person(req),identity=person?.member;
   if(['account-pending','account-approve','account-reject'].includes(action)){
    const {adminVerified}=await import('../lib/admin-session.mjs');
    if(!identity||!adminVerified(req,identity))return reply(res,403,{ok:false,error:'admin_unlock_required'});
    return reply(res,200,await memberCall({...req.body,member:identity}));
   }
   if(action==='account-self'){if(!identity)return reply(res,401,{ok:false,error:'registration_required'});return reply(res,200,await memberCall({action,member:identity}));}
   if(!['account-signup','account-login','account-change'].includes(action))return reply(res,400,{ok:false,error:'invalid_request'});
   const {accountAuthenticate}=await import('../lib/account-auth.mjs'),d=await accountAuthenticate(req.body,identity);
   if(action==='account-signup')return reply(res,200,{ok:true,pending:true});
   const p=d.profile||d.member;
   const cookies=[sa2Cookie({sub:'member-'+p.id,email:'MEMBER:'+p.id,label:p.name,member:{id:p.id,version:p.version}})];
   const {adminCookie,clearAdminCookie}=await import('../lib/admin-session.mjs');cookies.push(p.isMaster?adminCookie({id:p.id,version:p.version}):clearAdminCookie());
   res.setHeader('Set-Cookie',cookies);clearFailures(req);return reply(res,200,{ok:true,user:{label:p.name,role:p.role,isMaster:p.isMaster===true,team:p.team,memberId:p.id,auth:'member'}});
  }catch(e){failed(req);const known=/^(account_denied|account_pending|username_taken|member_account_exists|member_denied|member_locked|invalid_username|invalid_password|password_confirmation_mismatch|invalid_member_input|registration_required|member_session_revoked|master_required|stale_record)$/;return reply(res,e.message==='member_locked'?429:known.test(e.message)?400:503,{ok:false,error:known.test(e.message)?e.message:'auth_unavailable'});}
 }
 return reply(res,400,{ok:false,error:'invalid_request'});
}
