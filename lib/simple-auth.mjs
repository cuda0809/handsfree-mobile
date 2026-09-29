import crypto from 'node:crypto';
const COOKIE='hf_simple_person';
const BOOT_COOKIE='hf_simple_bootstrap';
const MAX_AGE=60*60*24*180;
const BOOT_AGE=60*10;
const RECOVERY_AGE=60*60*24*365;

function digest(v){return crypto.createHash('sha256').update(String(v)).digest();}
function equal(a,b){const x=digest(a),y=digest(b);return crypto.timingSafeEqual(x,y);}
function mac(v,k){return crypto.createHmac('sha256',k).update(v).digest('base64url');}
function cookieValue(req,name){
 const raw=String(req.headers?.cookie||'');
 const part=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
 return part?part.slice(name.length+1):'';
}
function signedPayload(prefix,payload,key){
 const data=Buffer.from(JSON.stringify(payload)).toString('base64url');
 return data+'.'+mac(prefix+data,key);
}
function readSigned(prefix,token,key){
 try{
  if(!key||!token)return null;
  const [data,sig]=String(token).split('.');
  if(!data||!sig||!equal(sig,mac(prefix+data,key)))return null;
  return JSON.parse(Buffer.from(data,'base64url').toString('utf8'));
 }catch{return null;}
}

export function validateRegistrationKey(supplied,key=process.env.HF_REAL_APP_KEY){return !!key&&!!supplied&&equal(supplied,key);}

export function simplePerson(req,key=process.env.HF_REAL_APP_KEY){
 const p=readSigned('hf-simple:',cookieValue(req,COOKIE),key);
 if(!p||!p.sub||!p.email||!Number.isFinite(p.exp)||p.exp<=Date.now()/1000)return null;
 return p;
}
export function simpleCookie(person,key=process.env.HF_REAL_APP_KEY){
 if(!key)throw Error('not_configured');
 const exp=Math.floor(Date.now()/1000)+MAX_AGE;
 const payload={sub:person.sub,email:person.email,exp,auth:'simple'};
 return `${COOKIE}=${signedPayload('hf-simple:',payload,key)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}
export function clearSimpleCookie(){return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;}

export function bootstrapCookie(key=process.env.HF_REAL_APP_KEY){
 if(!key)throw Error('not_configured');
 const exp=Math.floor(Date.now()/1000)+BOOT_AGE;
 return `${BOOT_COOKIE}=${signedPayload('hf-bootstrap:',{exp},key)}; Path=/api/simple-auth; Max-Age=${BOOT_AGE}; HttpOnly; Secure; SameSite=Strict`;
}
export function hasBootstrap(req,key=process.env.HF_REAL_APP_KEY){
 const p=readSigned('hf-bootstrap:',cookieValue(req,BOOT_COOKIE),key);
 return !!(p&&Number.isFinite(p.exp)&&p.exp>Date.now()/1000);
}
export function clearBootstrapCookie(){return `${BOOT_COOKIE}=; Path=/api/simple-auth; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;}

export function createRecoveryToken(email,pin,key=process.env.HF_REAL_APP_KEY){
 if(!key||!/^[0-9]{4}$/.test(String(pin)))throw Error('invalid_pin');
 const salt=crypto.randomBytes(16).toString('base64url');
 const exp=Math.floor(Date.now()/1000)+RECOVERY_AGE;
 const check=mac(`pin:${email}:${salt}:${pin}`,key);
 return signedPayload('hf-device:',{v:1,email,salt,check,exp},key);
}
export function verifyRecoveryToken(token,pin,key=process.env.HF_REAL_APP_KEY){
 const p=readSigned('hf-device:',token,key);
 if(!p||p.v!==1||!p.email||!p.salt||!p.check||!Number.isFinite(p.exp)||p.exp<=Date.now()/1000)return null;
 if(!/^[0-9]{4}$/.test(String(pin)))return null;
 const expected=mac(`pin:${p.email}:${p.salt}:${pin}`,key);
 return equal(p.check,expected)?p:null;
}
