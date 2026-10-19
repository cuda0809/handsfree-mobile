import crypto from 'node:crypto';
import {upstream} from './kmt-server.mjs';
export function memberPinHash(pin,salt){return crypto.scryptSync(pin,Buffer.from(salt,'base64url'),32,{N:16384,r:8,p:1,maxmem:64*1024*1024}).toString('base64url');}
export function memberEqual(a,b){return crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(),crypto.createHash('sha256').update(String(b)).digest());}
export function memberCodeHash(code){return crypto.createHash('sha256').update(String(code).replace(/[\s-]/g,'').toUpperCase()).digest('hex');}
export function memberProfile(row){return {id:row.id,name:row.name,team:row.team,role:row.role,isMaster:row.isMaster===true,version:row.version};}
export async function memberCall(body){const token=process.env.HF_REAL_READ_TOKEN;if(!token)throw Error('not_configured');const signed=JSON.stringify({...body,at:Date.now(),nonce:crypto.randomUUID()}),signature=crypto.createHmac('sha256',token).update(signed).digest('base64url');return upstream({op:'light_auth',signed,signature},25000);}
export async function memberAuthenticate(body,call=memberCall){
 const name=String(body.name||'').trim(),pin=String(body.pin||'');if(!name||name.length>30||!/^\d{6}$/.test(pin))throw Error('invalid_member_input');
 const d=await call({action:'lookup',name}),row=d.member;
 if(!row)throw Error('member_denied');
 if(body.action==='enroll'){
  if(row.status==='ACTIVE')throw Error('already_registered');
  if(pin!==String(body.confirmPin||''))throw Error('pin_confirmation_mismatch');
  const code=String(body.code||'');if(!/^[a-zA-Z0-9\s-]{16,48}$/.test(code))throw Error('member_denied');
  const salt=crypto.randomBytes(16).toString('base64url'),hash=memberPinHash(pin,salt);
  const r=await call({action:'enroll',id:row.id,codeHash:memberCodeHash(code),salt,hash,expected:row.version});return memberProfile(r.member);
 }
 const valid=row.status==='ACTIVE'&&row.salt&&row.hash&&memberEqual(memberPinHash(pin,row.salt),row.hash);
 const r=await call({action:valid?'login-success':'login-failure',id:row.id,expected:row.version,proof:valid?row.hash:''});
 if(!valid)throw Error('member_denied');return memberProfile(r.member);
}

export async function memberAdmin(identity,body,call=memberCall){
 if(!identity)throw Error('registration_required');
 const action=String(body.action||'');if(!['admin-list','admin-block','admin-approve','admin-permissions','admin-invite'].includes(action))throw Error('invalid_request');
 const payload={action,member:identity};
 if(action!=='admin-list'){payload.id=String(body.id||'');payload.expected=Number(body.expected);if(!/^HFU-\d{3}$/.test(payload.id)||!Number.isInteger(payload.expected))throw Error('invalid_request');}
 if(action==='admin-permissions'){payload.team=body.team;payload.role=body.role;}
 let code;
 if(action==='admin-invite'){code=crypto.randomBytes(12).toString('hex').toUpperCase();payload.codeHash=memberCodeHash(code);payload.expires=Date.now()+7*86400000;}
 const result=await call(payload);return {...result,...(code?{invitation:code,expires:payload.expires}:{})};
}
