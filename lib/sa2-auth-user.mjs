import {sa2Person} from './sa2-auth.mjs';
function delegatedWriter(){
  let users={};
  try{users=JSON.parse(process.env.HF_REAL_ALLOWED_USERS||'{}');}catch{return null;}
  const entries=Object.entries(users).map(([email,role])=>[String(email).toLowerCase(),String(role).toLowerCase()]);
  const configured=String(process.env.HF_SA2_WRITER_EMAIL||'').trim().toLowerCase();
  if(configured){
    const hit=entries.find(([email,role])=>email===configured&&['owner','writer'].includes(role));
    return hit?.[0]||null;
  }
  return entries.find(([,role])=>role==='writer')?.[0]||entries.find(([,role])=>role==='owner')?.[0]||null;
}
export function authUser(req){
  const p=sa2Person(req);
  if(!p)return null;
  const email=delegatedWriter();
  if(!email)return null;
  const isGuest=p.auth==='guest';
  const fallback=isGuest?'게스트':String(p.email||'').replace(/^SA2:/,'');
  const label=String(p.label||fallback).replace(/[\r\n\t|]/g,' ').trim().slice(0,30);
  return {...p,sub:p.sub+(label?'|'+label:''),email,sa2Label:label,role:isGuest?'reader':'writer',guest:isGuest};
}
