'use strict';
// Display only a server-verified identity. Cached labels never grant access.
(async()=>{
 const slot=document.querySelector('.demo span');if(!slot)return;
 try{
  const response=await fetch('/api/sa2-auth',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok||!data.ok)throw Error('unavailable');
  const user=data.user;
  if(!user){slot.textContent='로그인 필요';return;}
  if(user.auth!=='member'){slot.textContent=user.label+' · 기존 연결';return;}
  const roles={team_lead:'팀장',factory_manager:'공장장',member:'팀원'};
  slot.textContent=user.label+' · '+(user.team==='ALL'?'전체':user.team+'팀')+' '+(roles[user.role]||'')+(user.isMaster?' · 마스터':'');
  if(user.isMaster){const link=document.createElement('a');link.href='./members.html';link.textContent='사용자 관리';link.style.marginLeft='8px';slot.append(link);}
 }catch{slot.textContent='계정 확인 지연 · 권한 미확인';}
})();
