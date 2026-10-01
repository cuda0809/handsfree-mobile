'use strict';
function guestLocked(){open(heading('심사용 조회 전용','입력·수정 기능 잠김')+'<p>Hybrid 0.5의 조회 흐름을 확인하는 게스트 데모입니다. 운영 DB에 연결하지 않으며 기록·수정·일정 변경·전송은 제공하지 않습니다.</p>');}
for(const name of ['input','sendNote','saveNote','unlock','editIssue','saveIssue','editSchedule','saveSchedule','saveEditedAndSend','editLocalNote'])window[name]=guestLocked;
banner=function(){document.querySelector('.demo').innerHTML='<b>HandsFree Hybrid 0.5 · Core</b><span>심사용 샘플 · 게스트 · 조회 전용</span>';};
settings=function(){guestGuide()};
function guestGuide(){open(heading('Windows PC','앱 설치 안내')+'<p>이 공개 링크를 Edge 또는 Chrome에서 열고 <b>PC 앱 설치</b>를 누른 뒤 브라우저 설치 확인을 완료하세요.</p><p>버튼이 설치창을 열지 않으면 주소창 설치 아이콘을 이용하세요.<br>Edge 메뉴 → 앱 → 이 사이트를 앱으로 설치<br>Chrome 메뉴 → 전송, 저장, 공유 → 페이지를 앱으로 설치</p><p>설치 후 시작 메뉴에서 HandsFree를 검색하세요. 바탕화면 바로가기는 설치 후 옵션에서 선택하거나 시작 메뉴의 앱을 바탕화면으로 끌어 만드세요.</p><p>로그인/PIN 없이 조회 전용 · 인터넷 연결 필요<br>2026.10.11 10:30 KST 만료</p>');}
let guestInstallPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();guestInstallPrompt=e;document.getElementById('installStatus').textContent='설치 준비 완료';});
document.getElementById('installBtn').onclick=async()=>{if(!guestInstallPrompt)return guestGuide();try{await guestInstallPrompt.prompt();const result=await guestInstallPrompt.userChoice;document.getElementById('installStatus').textContent=result.outcome==='accepted'?'설치 승인됨':'설치 취소됨';}finally{guestInstallPrompt=null;}};
document.getElementById('guideBtn').onclick=guestGuide;
window.addEventListener('appinstalled',()=>{document.getElementById('installBtn').hidden=true;document.getElementById('installStatus').textContent='PC 앱 설치 완료';});
if(matchMedia('(display-mode: standalone)').matches){document.getElementById('installBtn').hidden=true;document.getElementById('installStatus').textContent='PC 앱으로 실행 중';}
function guestExpire(){document.getElementById('app').hidden=true;document.getElementById('guestLoading').hidden=true;document.getElementById('guestExpired').hidden=false;items=[];main.innerHTML='';dialog.close();document.getElementById('sheetBody').innerHTML='';guestVerified=false;}
guestReady.then(async ok=>{if(!ok)return;if(performance.now()>=guestDeadline)return guestExpire();document.getElementById('app').hidden=false;document.getElementById('guestLoading').hidden=true;await refresh();banner();});
setInterval(()=>{if(!guestVerified)return;if(performance.now()>=guestDeadline)return guestExpire();document.getElementById('expiryText').textContent='2026.10.11 10:30 KST 만료';},1000);
window.addEventListener('offline',()=>{document.getElementById('app').hidden=true;dialog.close();main.innerHTML='';document.getElementById('guestLoading').hidden=false;document.getElementById('guestLoading').textContent='인터넷 연결 후 새로고침해 주세요.';});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&guestVerified&&performance.now()>=guestDeadline)guestExpire();});
