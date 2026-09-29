import crypto from 'node:crypto';
const COOKIE='hf_sa2_person';
const MAX_AGE=60*60*24*180;
const RECOVERY_AGE=60*60*24*365;
function digest(v){return crypto.createHash('sha256').update(String(v)).digest();}
function equal(a,b){const x=digest(a),y=digest(b);return crypto.timingSafeEqual(x,y);}
function mac(v,k){return crypto.createHmac('sha256',k).update(v).digest('base64url');}
function cookieValue(req,name){const raw=String(req.headers?.cookie||'');const part=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return part?part.slice(name.length+1):'';}
function signed(prefix,payload,key){const data=Buffer.from(JSON.stringify(payload)).toString('base64url');return data+'.'+mac(prefix+data,key);}
function read(prefix,token,key){try{if(!key||!token)return null;const [data,sig]=String(token).split('.');if(!data||!sig||!equal(sig,mac(prefix+data,key)))return null;return JSON.parse(Buffer.from(data,'base64url').toString('utf8'));}catch{return null;}}
export function sa2Person(req,key=process.env.HF_REAL_APP_KEY){const p=read('hf-sa2:',cookieValue(req,COOKIE),key);if(!p||!p.sub||!p.email||!Number.isFinite(p.exp)||p.exp<=Date.now()/1000)return null;return p;}
export function sa2Cookie(person,key=process.env.HF_REAL_APP_KEY){if(!key)throw Error('not_configured');const exp=Math.floor(Date.now()/1000)+MAX_AGE;const payload={sub:person.sub,email:person.email,label:person.label||'',exp,auth:'sa2'};return `${COOKIE}=${signed('hf-sa2:',payload,key)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;}
export function clearSa2Cookie(){return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;}
export function createRecoveryToken(email,pin,key=process.env.HF_REAL_APP_KEY){if(!key||!/^[0-9]{4}$/.test(String(pin)))throw Error('invalid_pin');const salt=crypto.randomBytes(16).toString('base64url');const exp=Math.floor(Date.now()/1000)+RECOVERY_AGE;const check=mac(`pin:${email}:${salt}:${pin}`,key);return signed('hf-sa2-device:',{v:1,email,salt,check,exp},key);}
export function verifyRecoveryToken(token,pin,key=process.env.HF_REAL_APP_KEY){const p=read('hf-sa2-device:',token,key);if(!p||p.v!==1||!p.email||!p.salt||!p.check||!Number.isFinite(p.exp)||p.exp<=Date.now()/1000)return null;if(!/^[0-9]{4}$/.test(String(pin)))return null;return equal(p.check,mac(`pin:${p.email}:${p.salt}:${pin}`,key))?p:null;}
