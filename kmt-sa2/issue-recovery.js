// Keep every state request independently; a lost response must not lock other jobs.
const ISSUE_REQUEST_HISTORY='hf-issue-requests-v1';
function handsFreeInstallation(){
 const native=String(navigator.userAgent||'').match(/HandsFreeNative\/([\w.-]+)/);
 if(native)return {label:'설치형 Android 앱 · '+native[1],icon:'앱 내부 로고와 홈 화면 아이콘은 별개입니다. 설치형 아이콘 변경에는 기존 앱과 호환되는 업데이트 설치파일이 필요합니다. 기존 앱을 삭제하지 마세요.'};
 const webview=/Android/.test(navigator.userAgent||'')&&/; wv\)|\bwv\b/.test(navigator.userAgent||'');
 if(webview)return {label:'Android 앱 내부 화면',icon:'아이콘 변경 전에 기존 설치파일과의 호환성을 확인해야 합니다. 기존 앱을 삭제하지 마세요.'};
 if(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone)return {label:'홈 화면에 설치한 웹 앱',icon:'설치 아이콘은 휴대폰의 앱 갱신 시점에 반영됩니다. 입력 보존을 위해 기존 앱 삭제나 저장공간 초기화를 하지 마세요.'};
 return {label:'웹브라우저에서 사용 중',icon:'홈 화면 설치용 KMT 아이콘은 준비되어 있습니다. 기존 앱의 입력 기록은 현재 기기와 앱에 보존됩니다.'};
}
function issueRequestHistory(){
 const records=readStore(ISSUE_REQUEST_HISTORY,[]),list=Array.isArray(records)?records:[];
 const legacy=readStore('hf-issue-pending',null);
 if(legacy?.requestId&&!list.some(r=>r.requestId===legacy.requestId))list.unshift({...legacy,phase:'pending'});
 return list;
}
function rememberIssueRequest(body,phase,receipt=null){
 const list=issueRequestHistory(),index=list.findIndex(r=>r.requestId===body.requestId);
 const record={...(index>=0?list[index]:{}),...body,phase,updatedAt:new Date().toISOString()};
 if(receipt)record.receipt=receipt;
 if(index>=0)list[index]=record;else list.unshift(record);
 persist(ISSUE_REQUEST_HISTORY,list);return record;
}
function pendingIssueRequest(issueId){return issueRequestHistory().find(r=>r.issueId===issueId&&r.phase==='pending');}
function matchingIssueReceipt(body,d){
 return !!body&&d?.status==='APPLIED'&&d.requestId===body.requestId&&d.issueId===body.issueId&&d.orderId===body.orderId&&d.state===body.state&&d.nextAction===body.nextAction&&d.issueStatus===body.status;
}
function confirmIssueRequest(d){
 const body=issueRequestHistory().find(r=>r.requestId===d.requestId);
 if(!matchingIssueReceipt(body,d))throw Error('receipt_mismatch');
 rememberIssueRequest(body,'confirmed',d);
 if(readStore('hf-issue-pending',null)?.requestId===d.requestId)localStorage.removeItem('hf-issue-pending');
}
function issueRequestHistoryHtml(issueId){
 const list=issueRequestHistory().filter(r=>r.issueId===issueId);
 return list.length?'<details><summary>이 장비 상태 저장 요청 · '+list.length+'건</summary>'+list.map(r=>'<article class="item"><b>'+esc(r.phase==='confirmed'?'서버 저장 확인':r.phase==='rejected'?'서버 거절 · 원문 보관':'서버 저장 여부 확인 필요')+'</b><p>'+esc(r.state)+' · '+esc(r.reason)+'</p><small>'+esc(r.requestId)+'</small><button class="secondary" onclick="checkIssueReceipt(\''+esc(r.requestId)+'\')">이 요청 저장 결과 확인</button></article>').join('')+'</details>':'';
}
function restoreIssueDraft(issueId){
 const draft=readStore('hf-issue-drafts-v1',{})[issueId];if(!draft||appIssue?.issueId!==issueId)return;
 $('issueState').value=draft.state||'';$('issueNext').value=draft.nextAction||'';$('issueStatus').value=draft.status||'OPEN';$('issueReason').value=draft.reason||'';
 $('issueSaveHint').textContent='보관한 초안을 불러왔습니다. 현재 서버 상태와 비교한 뒤 저장하세요.';
}
function eventJournalConfirmed(r,d){
 if(d?.applied!==true||d.status!=='WRITTEN'||!d.requestId||(r.requestId&&r.requestId!==d.requestId)||!Array.isArray(d.events)||!d.events.length)return false;
 const lines=(r.eventType&&r.eventType!=='GENERAL'?r.text.split(/\r?\n|;/).map(v=>v.trim()).filter(Boolean).map(v=>r.target+' '+v):(r.eventType==='GENERAL'?r.text:r.target+' '+r.text).split(/\r?\n|;/).map(v=>v.trim()).filter(Boolean));
 const job=r.orderId||(String(r.target||'').match(/(?:[A-Z]{2,4}-)?\d{6}[A-Z]-\d{3}(?:-\d+)?/)||[])[0]||'';
 return d.events.length===lines.length&&d.events.every((e,i)=>e.status==='WRITTEN'&&e.orderId===job&&String(e.id||'').replace(/-E\d+$/,'')===d.requestId&&e.raw===lines[i]);
}
async function recoverJournalFromHistory(r){
 const job=r.orderId||(String(r.target||'').match(/(?:[A-Z]{2,4}-)?\d{6}[A-Z]-\d{3}(?:-\d+)?/)||[])[0];
 if(!r.requestId||!job)return null;
 const history=await appCall({action:'history',orderId:job});
 if(history.orderId!==job||!Array.isArray(history.events))return null;
 const events=history.events.filter(e=>e.requestId===r.requestId).sort((a,b)=>Number(String(a.id).match(/-E(\d+)$/)?.[1])-Number(String(b.id).match(/-E(\d+)$/)?.[1])).map(e=>({...e,orderId:e.projectId||e.orderId||''}));
 const receipt={ok:true,applied:true,status:'WRITTEN',requestId:r.requestId,events,ack:'정확한 요청 번호와 원문으로 서버 업무이력 저장 확인',receiptSource:'history'};
 return eventJournalConfirmed(r,receipt)?receipt:null;
}
