import crypto from 'node:crypto';
const COOKIE='hf_simple_person';
const MAX_AGE=60*60*24*180;
function digest(v){return crypto.createHash('sha256').update(String(v)).digest();}
function equal(a,b){const x=digest(a),y=digest(b);return crypto.timingSafeEqual(x,y);}
function mac(v,k){return crypto.createHmac('sha256',k).update(v).digest('base64url');}
export function validateRegistrationKey(supplied,key=process.env.HF_REAL_APP_KEY){return !!key&&!!supplied&&equal(supplied,key);}
export function simplePerson(req,key=process.env.HF_REAL_APP_KEY){
 try{
  if(!key)return null;
  const raw=String(req.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))||'';
  const [data,sig]=raw.slice(COOKIE.length+1).split('.');
  if(!data||!sig||!equal(sig,mac('hf-simple:'+data,key)))return null;
  const p=JSON.parse(Buffer.from(data,'base64url').toString('utf8'));
  if(!p.sub||!p.email||!Number.isFinite(p.exp)||p.exp<=Date.now()/1000)return null;
  return p;
 }catch{return null;}
}
export function simpleCookie(person,key=process.env.HF_REAL_APP_KEY){
 if(!key)throw Error('not_configured');
 const exp=Math.floor(Date.now()/1000)+MAX_AGE;
 const payload={sub:person.sub,email:person.email,exp,auth:'simple'};
 const data=Buffer.from(JSON.stringify(payload)).toString('base64url');
 return `${COOKIE}=${data}.${mac('hf-simple:'+data,key)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}
export function clearSimpleCookie(){return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;}
