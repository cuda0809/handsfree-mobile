import crypto from 'node:crypto';
function allowedUsers(){
 let raw={};try{raw=JSON.parse(process.env.HF_REAL_ALLOWED_USERS||'{}');}catch{}
 if(!raw||Array.isArray(raw)||typeof raw!=='object')return [];
 let labels={};try{labels=JSON.parse(process.env.HF_REAL_USER_LABELS||'{}');}catch{}
 const rows=Object.entries(raw).filter(([email,role])=>typeof email==='string'&&['owner','writer','reader'].includes(role));
 return rows.map(([email,role])=>({id:crypto.createHash('sha256').update(email).digest('hex').slice(0,24),email,role,label:typeof labels?.[email]==='string'&&labels[email].trim()?labels[email].trim():(rows.length===1?'내 계정':email.split('@')[0].replace(/[._-]+/g,' '))}));
}
function safeUser(u,label){return {email:u.email,role:u.role,label:label||u.label,auth:'sa2'};}
export default async function handler(req,res){
 const {reply}=await import('../lib/kmt-server.mjs');
 const {sameOrigin}=await import('../lib/person-auth.mjs');
 const {sa2Person,sa2Cookie,clearSa2Cookie,createRecoveryToken,verifyRecoveryToken}=await import('../lib/sa2-auth.mjs');
 const {roleFor}=await import('../lib/access.mjs');
 res.setHeader('Cache-Control','no-store, max-age=0');
 const users=allowedUsers();
 if(req.method==='GET'){
   const p=sa2Person(req);
   if(p){try{const role=roleFor(p.email),u=users.find(x=>x.email===p.email)||{email:p.email,role,label:p.label||'내 계정'};return reply(res,200,{ok:true,user:safeUser({...u,role},p.label||u.label),profiles:[]});}catch{res.setHeader('Set-Cookie',clearSa2Cookie());}}
   return reply(res,200,{ok:true,user:null,profiles:users.map(({id,label})=>({id,label})),profileCount:users.length});
 }
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 const action=String(req.body?.action||'');
 if(action==='logout'){res.setHeader('Set-Cookie',clearSa2Cookie());return reply(res,200,{ok:true});}
 if(action==='activate'){
   const pin=String(req.body?.pin||''),name=String(req.body?.name||'').trim().slice(0,30),profileId=String(req.body?.profileId||'');
   if(!/^[0-9]{4}$/.test(pin))return reply(res,400,{ok:false,error:'invalid_pin'});
   if(!name)return reply(res,400,{ok:false,error:'invalid_name'});
   if(!users.length)return reply(res,503,{ok:false,error:'users_not_configured'});
   const selected=users.length===1?users[0]:users.find(x=>x.id===profileId);
   if(!selected)return reply(res,403,{ok:false,error:'activation_denied'});
   let role;try{role=roleFor(selected.email);}catch{return reply(res,403,{ok:false,error:'activation_denied'});}
   const sub='sa2-'+crypto.createHash('sha256').update(selected.email).digest('hex').slice(0,24);
   const recoveryToken=createRecoveryToken(selected.email,pin);
   res.setHeader('Set-Cookie',sa2Cookie({sub,email:selected.email,label:name}));
   return reply(res,200,{ok:true,user:{email:selected.email,role,label:name,auth:'sa2'},recoveryToken,expiresInDays:180});
 }
 if(action==='pinLogin'){
   const token=String(req.body?.token||''),pin=String(req.body?.pin||''),name=String(req.body?.name||'').trim().slice(0,30);
   const recovered=verifyRecoveryToken(token,pin);
   if(!recovered)return reply(res,401,{ok:false,error:'pin_denied'});
   const selected=users.find(x=>x.email===recovered.email);
   if(!selected)return reply(res,403,{ok:false,error:'activation_denied'});
   let role;try{role=roleFor(selected.email);}catch{return reply(res,403,{ok:false,error:'activation_denied'});}
   const sub='sa2-'+crypto.createHash('sha256').update(selected.email).digest('hex').slice(0,24);
   res.setHeader('Set-Cookie',sa2Cookie({sub,email:selected.email,label:name||selected.label}));
   return reply(res,200,{ok:true,user:{email:selected.email,role,label:name||selected.label,auth:'sa2'},expiresInDays:180});
 }
 return reply(res,400,{ok:false,error:'invalid_request'});
}
