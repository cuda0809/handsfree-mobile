import crypto from 'node:crypto';

export default async function handler(req,res){
 const {person,personCookie,clearPersonCookie,cookies,sameOrigin,verifyGoogle}=await import('../lib/person-auth.mjs');
 const {reply}=await import('../lib/kmt-server.mjs');
 const {roleFor}=await import('../lib/access.mjs');
 if(req.method==='GET'){
  const p=person(req);
  if(p){try{return reply(res,200,{ok:true,user:{email:p.email,role:roleFor(p.email)},clientId:process.env.HF_GOOGLE_CLIENT_ID||''});}catch{res.setHeader('Set-Cookie',clearPersonCookie());return reply(res,403,{ok:false,error:'identity_denied'});}}
  const nonce=crypto.randomBytes(24).toString('base64url');
  res.setHeader('Set-Cookie',`hf_login_nonce=${nonce}; Path=/api/identity; Max-Age=300; HttpOnly; Secure; SameSite=Strict`);
  return reply(res,200,{ok:true,user:null,clientId:process.env.HF_GOOGLE_CLIENT_ID||'',nonce});
 }
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 if(req.body?.action==='logout'){res.setHeader('Set-Cookie',clearPersonCookie());return reply(res,200,{ok:true});}
 try{
  const p=await verifyGoogle(req.body?.credential,cookies(req).hf_login_nonce);
  const role=roleFor(p.email);
  res.setHeader('Set-Cookie',[personCookie(p),'hf_login_nonce=; Path=/api/identity; Max-Age=0; HttpOnly; Secure; SameSite=Strict']);
  return reply(res,200,{ok:true,user:{email:p.email,role}});
 }catch{return reply(res,401,{ok:false,error:'identity_denied'});}
}
