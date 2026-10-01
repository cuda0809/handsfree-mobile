/* Loaded after mobile.js. Daily plan editing preserves the existing visual shell. */
let scheduleView=null,scheduleEdit=null;
const scheduleErrors={personal_login_required:'사용자 등록이 필요합니다.',activation_required:'사용자 등록이 필요합니다.',identity_denied:'허용된 계정으로 로그인하세요.',forbidden:'이 계정은 일정을 수정할 수 없습니다.',source_mismatch:'월간계획과 원장 값이 달라 수정할 수 없습니다.',outside_edit_month:'월간계획에 표시된 기간에서만 이동할 수 있습니다.',destination_occupied:'그 날짜에 이미 일정이 있습니다.',stale_record:'다른 변경이 있습니다. 최신 일정을 다시 불러오세요.',invalid_date:'올바른 날짜를 입력하세요.',invalid_reason:'변경 사유를 입력하세요.',edit_gate_closed:'일정 수정 개방 전입니다.',formula_cell:'계산식으로 관리되는 일정입니다.',ambiguous_record:'원본 기록을 하나로 식별할 수 없습니다.',monthly_project_missing:'월간계획에서 이 프로젝트를 찾을 수 없습니다.'};
function scheduleMessage(code){return scheduleErrors[code]||'결과를 확정하지 못했습니다. 저장 결과를 확인하세요.';}
scheduleReport=async function(id){
 const x=typeof id==='object'?id:items[id];if(!x)return;const request=++planRequest;
 open(heading('계획일정',x.customer,x.model)+'<p id="planResult">일정을 불러오는 중…</p>');const result=$('planResult');
 if(!x.orderId){result.textContent='프로젝트 ID가 없어 일정을 연결할 수 없습니다.';return;}
 try{
  const d=await api('/api/sa2-lifecycle',{action:'plans',orderId:x.orderId});
  if(request!==planRequest||!result.isConnected||!dialog.open)return;
  if(d.orderId!==x.orderId||!Array.isArray(d.records))throw Error('invalid_plans');
  scheduleView={id,orderId:x.orderId,records:d.records};
  result.outerHTML='<p>날짜별 계획입니다. 완료 실적과는 별도로 관리됩니다.</p><button class="secondary" onclick="checkScheduleReceipt()">이 기기의 마지막 저장 결과 확인</button>'+(!d.editingAvailable?'<div class="alert">일정 수정 개방 전입니다.</div>':'')+
   (d.records.map((r,i)=>'<article class="item"><b>'+esc(r.date||'날짜 확인 필요')+' · '+esc(r.process)+'</b><p>원본월 '+esc(r.sourceMonth)+'</p>'+(r.editable&&d.editingAvailable?'<button class="secondary" onclick="editSchedule('+i+')">날짜 변경</button>':'<p class="note">'+esc(scheduleMessage(r.blockedReason||'edit_gate_closed'))+'</p>')+'</article>').join('')||'<p>등록된 계획이 없습니다.</p>');
 }catch(e){if(request===planRequest&&result.isConnected)result.innerHTML=esc(scheduleMessage(e.data?.error))+' <a href="./login.html">사용자 등록</a>';}
};
function editSchedule(index){
 const r=scheduleView?.records[index];if(!r?.editable)return;
 scheduleEdit={action:'edit',orderId:scheduleView.orderId,key:r.key,expected:r.revision,requestId:crypto.randomUUID(),beforeDate:r.date};
 open(heading('일정 수정',r.process,scheduleView.orderId)+'<p>'+esc(r.date)+' 일정의 날짜를 변경합니다.</p><label>변경 날짜<input type="date" id="scheduleDate" min="'+esc(r.minDate)+'" max="'+esc(r.maxDate)+'" value="'+esc(r.date)+'"></label><label>변경 사유<textarea id="scheduleReason" maxlength="500"></textarea></label><p id="scheduleHint" role="status"></p><button id="scheduleSave" class="primary" onclick="saveSchedule()">변경 내용 확인 후 저장</button>');
}
async function saveSchedule(){
 if(!scheduleEdit)return;const b={...scheduleEdit,date:$('scheduleDate').value,reason:$('scheduleReason').value.trim()};
 if(!b.date||!b.reason){$('scheduleHint').textContent='날짜와 변경 사유를 입력하세요.';return;}
 if(b.date===b.beforeDate){$('scheduleHint').textContent='변경할 날짜가 기존 날짜와 같습니다.';return;}
 const hint=$('scheduleHint'),button=$('scheduleSave');button.disabled=true;
 try{localStorage.setItem('hf-schedule-pending',JSON.stringify(b));}catch{hint.textContent='기기에 요청을 보관하지 못해 전송하지 않았습니다.';button.disabled=false;return;}
 hint.textContent='저장 결과를 확인하는 중…';
 try{const d=await api('/api/sa2-lifecycle',b,55000);await showScheduleReceipt(d);}
 catch(e){if(hint.isConnected){hint.textContent=scheduleMessage(e.data?.error);button.outerHTML='<button class="secondary" onclick="checkScheduleReceipt()">저장 결과 확인</button>';}}
}
async function showScheduleReceipt(d){
 if(d.status!=='APPLIED')throw Error('unconfirmed');
 const pending=readStore('hf-schedule-pending',null);
 if(!pending||d.requestId!==pending.requestId||d.orderId!==pending.orderId||d.key!==pending.key||d.date!==pending.date)throw Error('receipt_mismatch');
 const latest=await api('/api/sa2-lifecycle',{action:'plans',orderId:pending.orderId});
 const matches=latest.records?.filter(r=>r.key===pending.key);
 if(latest.orderId!==pending.orderId||matches?.length!==1||matches[0].date!==pending.date)throw Error('readback_mismatch');
 try{localStorage.removeItem('hf-schedule-pending');}catch{}
 open(heading('일정 저장 완료',d.beforeDate+' → '+d.date,d.orderId)+'<p>월간계획과 원장에 저장하고 변경이력을 남겼습니다.</p><p>'+esc(d.reason)+'</p><p class="note">작성자 '+esc(d.actor)+'<br>요청 번호 '+esc(d.requestId)+'</p>');scheduleEdit=null;
}
async function checkScheduleReceipt(){
 let b;try{b=JSON.parse(localStorage.getItem('hf-schedule-pending'));}catch{}if(!b)return toast('확인할 일정 요청이 없습니다.');
 try{const d=await api('/api/sa2-lifecycle',{action:'receipt',orderId:b.orderId,requestId:b.requestId});if(d.status==='APPLIED')await showScheduleReceipt(d);else toast('아직 저장 이력이 확인되지 않습니다. 자동 재전송하지 않습니다.');}catch{toast('서버 저장 결과와 최신 일정의 일치를 확인하지 못했습니다. 요청은 기기에 보관하며 자동 재전송하지 않습니다.');}
}

