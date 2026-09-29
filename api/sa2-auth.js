import crypto from 'node:crypto';

const PIN_SALT='lJRTC5NU6xH9XhPZDUewlA';
const PIN_HASH='BH_vzmRjgAljPZiEz4f7vroGaegZdb-F8ExdqfaGbsk';
const WINDOW_MS=10*60*1000;
const MAX_FAILS=5;
const attempts=globalThis.__hfSa2Attempts||(globalThis.__hfSa2Attempts=new Map());

function validPin(pin){
  if(!/^[0-9]{4}$/.test(String(pin)))return false;
  const salt=Buffer.from(PIN_SALT,'base64url');
  const expected=Buffer.from(PIN_HASH,'base64url');
  const actual=crypto.scryptSync(String(pin),salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);
}
function clientKey(req){return String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();}
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
 const {reply}=await import('../lib/kmt-server.mjs');
 const {sameOrigin}=await import('../lib/person-auth.mjs');
 const {sa2Person,sa2Cookie,clearSa2Cookie}=await import('../lib/sa2-auth.mjs');
 res.setHeader('Cache-Control','no-store, max-age=0');

 if(req.method==='GET'){
   const p=sa2Person(req);
   if(p)return reply(res,200,{ok:true,user:{label:p.label||String(p.email||'').replace(/^SA2:/,''),role:'writer',auth:'sa2'}});
   return reply(res,200,{ok:true,user:null});
 }
 if(req.method!=='POST')return reply(res,405,{ok:false,error:'method_not_allowed'});
 if(!sameOrigin(req))return reply(res,403,{ok:false,error:'invalid_origin'});
 const action=String(req.body?.action||'');
 if(action==='logout'){res.setHeader('Set-Cookie',clearSa2Cookie());return reply(res,200,{ok:true});}
 if(action!=='activate')return reply(res,400,{ok:false,error:'invalid_request'});
 if(blocked(req))return reply(res,429,{ok:false,error:'too_many_attempts'});

 const name=String(req.body?.name||'').replace(/[\r\n\t]/g,' ').trim().slice(0,30);
 const pin=String(req.body?.pin||'');
 if(!name)return reply(res,400,{ok:false,error:'invalid_name'});
 if(!validPin(pin)){failed(req);return reply(res,401,{ok:false,error:'pin_denied'});}
 clearFailures(req);

 const sub='sa2-'+crypto.createHash('sha256').update(name).digest('hex').slice(0,24);
 const actor='SA2:'+name;
 res.setHeader('Set-Cookie',sa2Cookie({sub,email:actor,label:name}));
 return reply(res,200,{ok:true,user:{label:name,role:'writer',auth:'sa2'},expiresInDays:180});
}
