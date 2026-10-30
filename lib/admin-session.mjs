import crypto from 'node:crypto';
const COOKIE='hf_sa2_admin',AGE=300;
export function adminCookie(member,key=process.env.HF_REAL_APP_KEY,now=Date.now()){
 if(!key)throw Error('not_configured');
 const payload=Buffer.from(JSON.stringify({id:member.id,version:member.version,exp:Math.floor(now/1000)+AGE})).toString('base64url');
 const sig=crypto.createHmac('sha256',key).update('hf-admin:'+payload).digest('base64url');
 return `${COOKIE}=${payload}.${sig}; Path=/api/; Max-Age=${AGE}; HttpOnly; Secure; SameSite=Strict`;
}
export function adminVerified(req,member,key=process.env.HF_REAL_APP_KEY,now=Date.now()){
 try{
  if(!key||!member)return false;
  const token=String(req.headers?.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const [payload,sig]=String(token||'').split('.');
  const expected=crypto.createHmac('sha256',key).update('hf-admin:'+payload).digest();
  const actual=Buffer.from(sig||'','base64url');if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual))return false;
  const p=JSON.parse(Buffer.from(payload,'base64url').toString());
  return p.id===member.id&&p.version===member.version&&p.exp>now/1000&&p.exp<=now/1000+AGE;
 }catch{return false;}
}
export function clearAdminCookie(){return `${COOKIE}=; Path=/api/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;}
