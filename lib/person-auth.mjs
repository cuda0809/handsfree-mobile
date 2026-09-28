import crypto from 'node:crypto';

const COOKIE='hf_person';
let keyCache={until:0,keys:[]};
export function cookies(req){return Object.fromEntries(String(req.headers?.cookie||'').split(';').map(x=>x.trim().split(/=(.*)/s)).filter(x=>x[0]).map(x=>[x[0],x[1]||'']));}
function mac(value,key){return crypto.createHmac('sha256',key).update(value).digest('base64url');}
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function encodePerson(person,key=process.env.HF_REAL_APP_KEY){if(!key)throw Error('not_configured');const data=Buffer.from(JSON.stringify(person)).toString('base64url');return data+'.'+mac('hf-person:'+data,key);}
export function person(req,key=process.env.HF_REAL_APP_KEY){try{if(!key)return null;const [data,sig]=String(cookies(req)[COOKIE]||'').split('.');if(!equal(sig,mac('hf-person:'+data,key)))return null;const p=JSON.parse(Buffer.from(data,'base64url'));if(!p.sub||!p.email||!Number.isFinite(p.exp)||p.exp<=Date.now()/1000)return null;return p;}catch{return null;}}
export function personCookie(p){return `${COOKIE}=${encodePerson(p)}; Path=/; Max-Age=${Math.max(0,Math.floor(p.exp-Date.now()/1000))}; HttpOnly; Secure; SameSite=Strict`;}
export function clearPersonCookie(){return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;}
export function sameOrigin(req){const origin=req.headers?.origin,host=req.headers?.host;try{return !!origin&&new URL(origin).host===host&&/^https?:$/.test(new URL(origin).protocol)&&req.headers['sec-fetch-site']!=='cross-site';}catch{return false;}}
export function actorProof(p){const actor=JSON.stringify({sub:p.sub,email:p.email,exp:Math.min(p.exp,Math.floor(Date.now()/1000)+120)});return {actor,actorSignature:mac(actor,process.env.HF_REAL_READ_TOKEN)};}
export async function verifyGoogle(credential,nonce,{clientId=process.env.HF_GOOGLE_CLIENT_ID,fetcher=fetch,now=Date.now()/1000}={}){
 if(!clientId||!nonce||typeof credential!=='string'||credential.length>10000)throw Error('invalid_identity');
 const parts=credential.split('.');if(parts.length!==3)throw Error('invalid_identity');
 const h=JSON.parse(Buffer.from(parts[0],'base64url')),p=JSON.parse(Buffer.from(parts[1],'base64url'));
 if(h.alg!=='RS256'||typeof h.kid!=='string')throw Error('invalid_identity');
 if(keyCache.until<now||!keyCache.keys.some(k=>k.kid===h.kid)){
  const r=await fetcher('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!r.ok)throw Error('identity_unavailable');const d=await r.json();if(!Array.isArray(d.keys))throw Error('identity_unavailable');keyCache={until:now+300,keys:d.keys};
 }
 const jwk=keyCache.keys.find(k=>k.kid===h.kid&&k.kty==='RSA'&&k.use==='sig'&&k.alg==='RS256');
 if(!jwk||!crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error('invalid_identity');
 if(!['accounts.google.com','https://accounts.google.com'].includes(p.iss)||p.aud!==clientId||(p.azp&&p.azp!==clientId)||!Number.isFinite(p.exp)||p.exp<=now||!Number.isFinite(p.iat)||p.iat>now+60||p.exp-p.iat>3700||p.nonce!==nonce||p.email_verified!==true||typeof p.sub!=='string'||!p.sub||typeof p.email!=='string'||(!p.email.endsWith('@gmail.com')&&!p.hd))throw Error('invalid_identity');
 return {sub:p.sub,email:p.email.toLowerCase(),exp:Math.min(p.exp,Math.floor(now)+3600)};
}
