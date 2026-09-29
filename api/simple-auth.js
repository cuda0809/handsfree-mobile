import crypto from 'node:crypto';
export default async function handler(req,res){
 const {reply}=await import('../lib/kmt-server.mjs');
 const {sameOrigin}=await import('../lib/person-auth.mjs');
 const {simplePerson,simpleCookie,clearSimpleCookie,validateRegistrationKey}=await import('../lib/simple-auth.mjs');
 const {roleFor}=await import('../lib/access.mjs');
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method==='GET'){
  const p=simplePerson(req);
  if(!p)return reply(res,200,{ok:true,user:null});
  try{return reply(res,200,{ok:true,user:{email:p.email,role:roleFor(p.email),auth:'simple'}});}
  catch{res.setHeader('Set-Cookie',clearSimpleCookie());return reply(res,200,{ok:true,user:null});}
 }
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 if(req.body?.action==='logout'){res.setHeader('Set-Cookie',clearSimpleCookie());return reply(res,200,{ok:true});}
 const email=String(req.body?.email||'').trim().toLowerCase();
 const key=String(req.body?.key||'');
 if(!email||email.length>160||!validateRegistrationKey(key))return reply(res,401,{ok:false,error:'activation_denied'});
 let role;try{role=roleFor(email);}catch{return reply(res,403,{ok:false,error:'activation_denied'});}
 const sub='simple-'+crypto.createHash('sha256').update(email).digest('hex').slice(0,24);
 res.setHeader('Set-Cookie',simpleCookie({sub,email}));
 return reply(res,200,{ok:true,user:{email,role,auth:'simple'},expiresInDays:180});
}
