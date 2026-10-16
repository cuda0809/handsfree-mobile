// Private equipment history. Never writes today's text issues or equipment state.
const photoDraftStore={
 async db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('hf-equipment-photos-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('draft_storage_failed'));});},
 async run(mode,key,value){const db=await this.db();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('drafts',mode),store=tx.objectStore('drafts');let result;const r=value===undefined?store.get(key):value===null?store.delete(key):store.put(value,key);r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('draft_storage_failed'));});}finally{db.close();}}
};
async function photoCall(body){return api('/api/sa2-app',body,55000);}
async function prepareEquipmentPhoto(file){
 if(!file||!file.type.startsWith('image/')||file.size>25000000)throw Error('사진 파일은 25MB 이하로 선택하세요.');
 const image=await createImageBitmap(file);try{
  const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  let blob;for(const quality of [.82,.65,.45,.25]){blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',quality));if(blob&&blob.size<=1000000)break;}
  if(!blob||blob.size>1000000)throw Error('사진을 줄일 수 없습니다. 더 작은 사진을 선택하세요.');
  return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('사진을 읽지 못했습니다.'));r.readAsDataURL(blob);});
 }finally{image.close();}
}
function photoError(e){const code=e.data?.error||e.message;return ({media_not_ready:'사진 저장소 설정 대기 중입니다.',media_access_required:'사진 저장 권한 확인이 필요합니다.',media_pending:'저장 결과가 미확인입니다. 저장 확인을 먼저 눌러주세요.',request_conflict:'동일 기록의 내용이 달라 저장을 중단했습니다.',media_corrupt:'사진 검증에 실패했습니다.',forbidden:'저장 권한이 없습니다.'})[code]||'연결을 확인할 수 없습니다. 입력한 사진·메모는 보존됩니다.';}
let photoScreenGeneration=0;
async function openEquipmentPhotos(orderId,capture=false){
 const x=items.find(x=>x.orderId===orderId);if(!x)return toast('장비를 다시 조회하세요.');
 const generation=++photoScreenGeneration;
 open(heading('PHOTO HISTORY',x.customer,x.orderId+' · '+x.model)+'<p class="note">사진·메모는 장비별 이력으로만 보관합니다.</p><div id="photoHistory" aria-live="polite">사진 이력 조회 중…</div><button id="photoCompose" class="secondary">📷 사진·메모 추가</button><div id="photoEditor"></div>');
 const history=$('photoHistory'),editor=$('photoEditor');let entries=[],mediaReady=false;
 async function renderDraft(){
  let draft;try{draft=await photoDraftStore.run('readonly',orderId);}catch{editor.textContent='임시 저장소를 열 수 없습니다. 사진 저장을 시작하지 않았습니다.';return;}
  if(!editor.isConnected||generation!==photoScreenGeneration)return;
  draft=draft||{requestId:crypto.randomUUID(),issueId:'PHI-'+crypto.randomUUID(),issueTitle:'',memo:'',takenAt:'',data:'',status:'draft'};
  editor.innerHTML='<label>이슈 묶음<select id="photoIssue"><option value="">새 이슈</option>'+[...new Map(entries.map(r=>[r.issueId,r])).values()].map(r=>'<option value="'+esc(r.issueId)+'">'+esc(r.issueTitle)+'</option>').join('')+'</select></label><label>이슈 제목<input id="photoTitle" maxlength="80" value="'+esc(draft.issueTitle)+'"></label><label class="secondary">📷 촬영 / 사진 선택<input id="photoFile" type="file" accept="image/*" capture="environment"></label><img id="photoPreview" alt="저장할 사진 미리보기" '+(draft.data?'src="data:image/jpeg;base64,'+draft.data+'"':'hidden')+'><label>메모<textarea id="photoMemo" maxlength="1000">'+esc(draft.memo)+'</textarea></label><p id="photoStatus" role="status"></p><button id="photoSave" class="primary">사진·메모 저장</button><button id="photoReceipt" class="secondary">저장 결과 확인</button><button id="photoResume" class="secondary" hidden>같은 기록 저장 이어하기</button>';
  const title=$('photoTitle'),memo=$('photoMemo'),select=$('photoIssue'),file=$('photoFile'),save=$('photoSave'),receipt=$('photoReceipt'),resume=$('photoResume'),status=$('photoStatus');
  select.value=entries.some(r=>r.issueId===draft.issueId)?draft.issueId:'';
  let pending=Promise.resolve(),failed=false,busy=false;
  function persistDraft(){draft.issueTitle=title.value.trim();draft.memo=memo.value.trim();const snapshot={...draft};pending=pending.catch(()=>{}).then(()=>photoDraftStore.run('readwrite',orderId,snapshot)).then(()=>{failed=false;},()=>{failed=true;status.textContent='임시 저장 실패 · 사진 저장을 진행하지 않았습니다.';});return pending;}
  function lock(){const uncertain=draft.status==='unknown';[title,memo,select,file].forEach(e=>e.disabled=busy||uncertain);save.disabled=busy||uncertain||!mediaReady;receipt.disabled=busy;resume.disabled=busy||!mediaReady;resume.hidden=!uncertain;}
  title.oninput=memo.oninput=persistDraft;
  select.onchange=()=>{const selected=entries.find(r=>r.issueId===select.value);draft.issueId=selected?.issueId||'PHI-'+crypto.randomUUID();if(selected)title.value=selected.issueTitle;persistDraft();};
  file.onchange=async()=>{busy=true;lock();try{draft.data=await prepareEquipmentPhoto(file.files[0]);draft.takenAt=new Date().toISOString();$('photoPreview').src='data:image/jpeg;base64,'+draft.data;$('photoPreview').hidden=false;await persistDraft();}catch(e){status.textContent=e.message;}finally{busy=false;lock();}};
  async function confirmStored(result){if(result.status!=='STORED')return false;const listed=await photoCall({action:'media-list',orderId});if(!listed.entries.some(r=>r.requestId===draft.requestId))throw Error('media_pending');await photoDraftStore.run('readwrite',orderId,null);status.textContent='저장 완료 · 재조회 확인';await openEquipmentPhotos(orderId,false);return true;}
  async function savePhoto(recover=false){if(busy||draft.status==='unknown'&&!recover)return;busy=true;lock();await persistDraft();if(failed||!draft.data||!draft.memo||!draft.issueTitle){if(!failed)status.textContent='사진·이슈 제목·메모를 입력하세요.';busy=false;lock();return;}try{
   // Persist uncertainty BEFORE dispatch. Closing the app never makes a write safe to resend.
   draft.status='unknown';await photoDraftStore.run('readwrite',orderId,{...draft});
   const result=await photoCall({action:'media-save',resume:recover,orderId,requestId:draft.requestId,issueId:draft.issueId,issueTitle:draft.issueTitle,memo:draft.memo,takenAt:draft.takenAt,mime:'image/jpeg',data:draft.data});
   await confirmStored(result);
  }catch(e){status.textContent=photoError(e)+' 저장 결과 확인을 눌러주세요.';}finally{busy=false;lock();}}
  save.onclick=()=>savePhoto(false);resume.onclick=()=>savePhoto(true);
  receipt.onclick=async()=>{if(busy)return;busy=true;lock();try{if(!await confirmStored(await photoCall({action:'media-receipt',orderId,requestId:draft.requestId})))status.textContent='저장이 아직 확인되지 않았습니다. 입력은 보존되며 자동 재전송하지 않습니다.';}catch(e){status.textContent=photoError(e);}finally{busy=false;lock();}};
  lock();if(draft.status==='unknown')status.textContent='미확인 저장이 있습니다. 저장 결과 확인을 눌러주세요.';
 }
 $('photoCompose').onclick=renderDraft;
 try{const result=await photoCall({action:'media-list',orderId});if(generation!==photoScreenGeneration||!history.isConnected)return;entries=result.entries||[];mediaReady=result.ready===true;
  history.innerHTML=(!result.ready?'<p class="alert">사진 저장소 설정 대기 중</p>':'')+(entries.length?entries.map(r=>'<article class="photo-history-entry"><b>'+esc(r.issueTitle)+'</b><small>'+esc(r.at)+' · '+esc(r.actor)+'</small><p>'+esc(r.memo)+'</p><button class="secondary" data-photo-request="'+esc(r.requestId)+'">사진 보기</button></article>').join(''):'<p class="note">저장된 사진 이력이 없습니다.</p>');
  history.querySelectorAll('[data-photo-request]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{const photo=await photoCall({action:'media-get',orderId,requestId:button.dataset.photoRequest});const img=document.createElement('img');img.alt='장비 이력 사진';img.src='data:image/jpeg;base64,'+photo.data;button.replaceWith(img);}catch(e){button.disabled=false;toast(photoError(e));}});
 }catch(e){history.textContent=photoError(e);}
 if(capture&&generation===photoScreenGeneration)await renderDraft();
}
