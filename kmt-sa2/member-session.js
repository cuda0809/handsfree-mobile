'use strict';
// Identity lives on the account button; data refresh owns the connection row.
(async()=>{
 const button=document.querySelector('.login-button');if(!button)return;
 try{
  const response=await fetch('/api/sa2-auth',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok||!data.ok)throw Error('unavailable');
  const user=data.user;
  if(!user){button.textContent='연결';button.setAttribute('aria-label','앱 연결');return;}
  const master=user.auth==='member'&&user.isMaster===true;
  const pendingOwner=user.auth!=='member'&&user.label==='이상준';
  button.textContent=master?'마스터':'내 계정';
  button.setAttribute('aria-label',user.label+(master?' · B팀장 · 마스터 관리':pendingOwner?' · 기존 연결 유지 · 내 계정':' · 자동 연결된 계정'));
  button.onclick=()=>{location.href=master?'./members.html':'./login.html?manage=1';};
 }catch{button.textContent='계정 확인';button.setAttribute('aria-label','계정 확인 지연 · 일반 조회는 유지');}
})();
