'use strict';
document.title='HandsFree WEB · 케이엠텍';
const webNotice=document.createElement('div');webNotice.className='web-notice';
webNotice.innerHTML='<b>WEB 01</b><span>웹 복사본 · 서버 기록 연결</span><small>여기서 저장한 내용은 실제 업무 기록에 반영됩니다.</small>';
document.querySelector('.top').after(webNotice);
const webProfile=document.querySelector('.login-button');
if(webProfile){webProfile.textContent=(window.hfWebUser?.label||'내 계정')+' · 설정';webProfile.setAttribute('aria-label','계정과 웹 설정');webProfile.onclick=()=>settings();}
settings=function(){open(heading('HANDSFREE WEB','계정과 웹 설정',BUILD)+'<p>'+esc(window.hfWebUser?.label||'연결된 사용자')+'</p><p>PC와 휴대폰에서 같은 웹 주소를 사용하세요. 이 브라우저의 연결 정보는 쿠키로 유지됩니다.</p><button class="secondary" onclick="login()">계정 연결 관리</button><button class="secondary" onclick="showInbox()">이 브라우저 입력 이력 · 미확인 접수</button><button class="secondary" onclick="checkUpdate()">웹 버전 확인</button><p class="note">서버에 저장된 장비 이력은 함께 조회합니다. 앱에만 남아 있는 미전송 초안은 이 브라우저로 자동 이동하지 않습니다.</p>');};
checkUpdate=async function(){await checkForLiveUpdate();toast(document.getElementById('hfUpdateAvailable')?'새 버전 적용 버튼을 확인하세요.':'웹 버전을 확인했습니다.');};
