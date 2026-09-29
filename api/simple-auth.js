import crypto from 'node:crypto';

function allowedUsers(){
 let raw={};try{raw=JSON.parse(process.env.HF_REAL_ALLOWED_USERS||'{}');}catch{}
 if(!raw||Array.isArray(raw)||typeof raw!=='object')return [];
 let labels={};try{labels=JSON.parse(process.env.HF_REAL_USER_LABELS||'{}');}catch{}
 const rows=Object.entries(raw).filter(([email,role])=>typeof email==='string'&&['owner','writer','reader'].includes(role));
 return rows.map(([email,role])=>({
   id:crypto.createHash('sha256').update(email).digest('hex').slice(0,24),
   email,
   role,
   label:typeof labels?.[email]==='string'&&labels[email].trim()?labels[email].trim():(rows.length===1?'내 계정':email.split('@')[0].replace(/[._-]+/g,' '))
 }));
}
function safeUser(email,role,label){return {email,role,label,auth:'simple'};}

export default async function handler(req,res){
 const {reply}=await import('../lib/kmt-server.mjs');
 const {sameOrigin}=await import('../lib/person-auth.mjs');
 const {simplePerson,simpleCookie,clearSimpleCookie,createRecoveryToken,verifyRecoveryToken}=await import('../lib/simple-auth.mjs');
 const {roleFor}=await import('../lib/access.mjs');
 res.setHeader('Cache-Control','no-store, max-age=0');
 const users=allowedUsers();

 if(req.method==='GET'){
  const p=simplePerson(req);
  if(p){
   try{
    const role=roleFor(p.email),row=users.find(x=>x.email===p.email);
    return reply(res,200,{ok:true,user:safeUser(p.email,role,row?.label||'내 계정')});
   }catch{
    res.setHeader('Set-Cookie',clearSimpleCookie());
   }
  }
  return reply(res,200,{ok:true,user:null,profiles:users.map(({id,label})=>({id,label}))});
 }

 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 const action=String(req.body?.action||'');

 if(action==='logout'){
  res.setHeader('Set-Cookie',clearSimpleCookie());
  return reply(res,200,{ok:true});
 }

 if(action==='activate'){
  const profileId=String(req.body?.profileId||''),pin=String(req.body?.pin||'');
  if(!/^[0-9]{4}$/.test(pin))return reply(res,400,{ok:false,error:'invalid_pin'});
  const selected=users.find(x=>x.id===profileId);
  if(!selected)return reply(res,403,{ok:false,error:'activation_denied'});
  let role;try{role=roleFor(selected.email);}catch{return reply(res,403,{ok:false,error:'activation_denied'});}
  const sub='simple-'+crypto.createHash('sha256').update(selected.email).digest('hex').slice(0,24);
  const recoveryToken=createRecoveryToken(selected.email,pin);
  res.setHeader('Set-Cookie',simpleCookie({sub,email:selected.email}));
  return reply(res,200,{ok:true,user:safeUser(selected.email,role,selected.label),recoveryToken,expiresInDays:180});
 }

 if(action==='pinLogin'){
  const token=String(req.body?.token||''),pin=String(req.body?.pin||'');
  const recovered=verifyRecoveryToken(token,pin);
  if(!recovered)return reply(res,401,{ok:false,error:'pin_denied'});
  const selected=users.find(x=>x.email===recovered.email);
  if(!selected)return reply(res,403,{ok:false,error:'activation_denied'});
  let role;try{role=roleFor(selected.email);}catch{return reply(res,403,{ok:false,error:'activation_denied'});}
  const sub='simple-'+crypto.createHash('sha256').update(selected.email).digest('hex').slice(0,24);
  res.setHeader('Set-Cookie',simpleCookie({sub,email:selected.email}));
  return reply(res,200,{ok:true,user:safeUser(selected.email,role,selected.label),expiresInDays:180});
 }

 return reply(res,400,{ok:false,error:'invalid_request'});
}
