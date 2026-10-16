/* Private per-equipment/issue photo history. No operational state or text-issue writes. */
var HF_MEDIA={index:'HF_MEDIA_사진이력',queue:'HF_MEDIA_저장대기',headers:['Request_ID','Project_ID','JOB_NO','Issue_ID','Issue_Title','At','Taken_At','Actor_Sub','Actor_Label','Memo','Photo_ID','Memo_ID','Mime','Hash','Issue_Folder_ID','Status'],queueHeaders:['Request_ID','At','Actor_Sub','Payload_Hash','Payload','Classification','Status','Photo_ID','Memo_ID','Error']};
function hfMediaTable_(ss,name,headers,create){
 var sh=ss.getSheetByName(name);if(!sh&&create){sh=ss.insertSheet(name);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);}
 if(sh&&JSON.stringify(sh.getRange(1,1,1,headers.length).getDisplayValues()[0])!==JSON.stringify(headers))throw Error('invalid_metadata');return sh;
}
function hfMediaRows_(sh,cols){return sh&&sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,cols).getDisplayValues():[];}
// SpreadsheetApp caches values read before a REST batch. Verify through the same Sheets API.
function hfMediaFreshRows_(ss,name,last){return (Sheets.Spreadsheets.Values.get(ss.getId(),"'"+name+"'!A2:"+last).values||[]).map(function(r){return r.map(String);});}
function hfMediaTarget_(ss,job){
 var target=resolveUnifiedCoreProject_(ss,job);if(target.ambiguous)throw Error('project_mismatch');
 var rows=ss.getSheetByName('HF_CORE_통합운영').getRange(2,1,ss.getSheetByName('HF_CORE_통합운영').getLastRow()-1,5).getDisplayValues().filter(function(r){return r[1]===job;});
 if(rows.length!==1)throw Error('project_mismatch');return {id:rows[0][0],job:job,customer:target.customer};
}
function hfMediaDrive_(path,options){
 options=options||{};options.headers=Object.assign({},options.headers,{Authorization:'Bearer '+ScriptApp.getOAuthToken()});options.muteHttpExceptions=true;
 var r=UrlFetchApp.fetch('https://www.googleapis.com/'+path,options),code=r.getResponseCode();
 if(code<200||code>=300){var detail={};try{detail=JSON.parse(r.getContentText()).error||{};}catch(ignore){}console.log(JSON.stringify({check:'media_drive',http:code,status:detail.status||'',reasons:(detail.errors||[]).map(function(e){return e.reason||'';})}));}
 if(code===401||code===403)throw Error('media_access_required');if(code===404)throw Error('media_missing');if(code<200||code>=300)throw Error('media_unavailable');
 return options.raw?r:JSON.parse(r.getContentText());
}
function hfMediaFolder_(parent,key,name){
 var q="trashed=false and mimeType='application/vnd.google-apps.folder' and '"+parent+"' in parents and appProperties has { key='hfKey' and value='"+key+"' }";
 var files=hfMediaDrive_('drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id)&pageSize=2').files||[];
 if(files.length>1)throw Error('request_conflict');if(files.length)return files[0].id;
 return hfMediaDrive_('drive/v3/files?fields=id',{method:'post',contentType:'application/json',payload:JSON.stringify({name:name.slice(0,150),mimeType:'application/vnd.google-apps.folder',parents:[parent],appProperties:{hfKey:key}})}).id;
}
function hfMediaFile_(folder,id,name,mime,bytes){
 // A manual recovery reuses its reserved ID. Never create a second copy.
 try{var prior=hfMediaDrive_('drive/v3/files/'+id+'?alt=media',{raw:true}).getBlob().getBytes();if(Utilities.base64Encode(prior)!==Utilities.base64Encode(bytes))throw Error('request_conflict');return;}catch(e){if(e.message!=='media_missing')throw e;}
 var boundary='HF_'+Utilities.getUuid().replace(/-/g,'');
 var start='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({id:id,name:name,parents:[folder]})+'\r\n--'+boundary+'\r\nContent-Type: '+mime+'\r\n\r\n';
 var payload=Utilities.newBlob(start).getBytes().concat(bytes).concat(Utilities.newBlob('\r\n--'+boundary+'--\r\n').getBytes());
 hfMediaDrive_('upload/drive/v3/files?uploadType=multipart&fields=id',{method:'post',contentType:'multipart/related; boundary='+boundary,payload:payload});
}
function hfMediaView_(r){return {requestId:r[0],projectId:r[1],orderId:r[2],issueId:r[3],issueTitle:r[4],at:r[5],takenAt:r[6],actor:r[8],memo:r[9],mime:r[12],status:r[15]};}
function hfMediaSave_(ss,b,body,target,isolatedRoot){
 if(isolatedRoot&&ss.getId()===HF_SPREADSHEET_ID)throw Error('production_test_forbidden');
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestId||'')||!/^PHI-[a-zA-Z0-9-]{16,70}$/.test(b.issueId||'')||!b.issueTitle||b.issueTitle.length>80||typeof b.memo!=='string'||b.memo.length>1000||b.mime!=='image/jpeg'||!(/^[a-f0-9]{64}$/).test(b.hash||''))throw Error('invalid_metadata');
 if(typeof body.data!=='string'||body.data.length>1400000)throw Error('invalid_photo');
 var bytes=Utilities.base64Decode(body.data),hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(function(x){return ('0'+(x&255).toString(16)).slice(-2);}).join('');
 if(bytes.length<4||bytes.length>1000000||(bytes[0]&255)!==255||(bytes[1]&255)!==216||(bytes[bytes.length-2]&255)!==255||(bytes[bytes.length-1]&255)!==217||hash!==b.hash)throw Error('invalid_photo');
 var index=hfMediaTable_(ss,HF_MEDIA.index,HF_MEDIA.headers,false),rows=index?hfMediaFreshRows_(ss,HF_MEDIA.index,'P'):[],prior=rows.filter(function(r){return r[0]===b.requestId;});
 var payloadHash=hfLsHash_([target.id,b.issueId,b.issueTitle,b.memo,b.takenAt||'',b.hash,b.actor.sub]);
 if(prior.length>1)throw Error('request_conflict');
 if(prior.length){var r=prior[0];if(r[1]!==target.id||r[7]!==b.actor.sub||r[9]!==b.memo||r[13]!==b.hash||r[3]!==b.issueId||r[4]!==b.issueTitle||r[6]!==String(b.takenAt||''))throw Error('request_conflict');return {ok:true,status:'STORED',entry:hfMediaView_(r)};}
 var sameIssue=rows.filter(function(r){return r[3]===b.issueId;});if(sameIssue.some(function(r){return r[1]!==target.id||r[4]!==b.issueTitle;}))throw Error('project_mismatch');
 var root=isolatedRoot||PropertiesService.getScriptProperties().getProperty('HF_MEDIA_ROOT');if(!root)throw Error('media_not_ready');
 var queue=hfMediaTable_(ss,HF_MEDIA.queue,HF_MEDIA.queueHeaders,true),pending=hfMediaFreshRows_(ss,HF_MEDIA.queue,'J').filter(function(r){return r[0]===b.requestId;});
 if(pending.length){if(pending.length!==1||pending[0][2]!==b.actor.sub||pending[0][3]!==payloadHash)throw Error('request_conflict');if(b.resume!==true)throw Error('media_pending');}
 var allQueue=hfMediaFreshRows_(ss,HF_MEDIA.queue,'J'),row=pending.length?allQueue.findIndex(function(r){return r[0]===b.requestId;})+2:queue.getLastRow()+1;
 var now=pending.length?pending[0][1]:new Date().toISOString();
 if(!pending.length)queue.getRange(row,1,1,10).setValues([[b.requestId,now,b.actor.sub,payloadHash,JSON.stringify({projectId:target.id,orderId:target.job,issueId:b.issueId,issueTitle:b.issueTitle,memo:b.memo,takenAt:b.takenAt||'',hash:b.hash}),'PHOTO_NOTE','CLASSIFIED','','','']]);
 try{
  if(!/^OPEN\b/.test(safety_(ss,'Field Input Safe Write')))throw Error('safe_write_not_ready');
  var projectFolder=hfMediaFolder_(root,'project-'+target.id,target.id+'__'+target.job+'__'+target.customer);
  var issueFolder=hfMediaFolder_(projectFolder,b.issueId,b.issueId+'__'+b.issueTitle);
  var ids=pending.length&&pending[0][7]&&pending[0][8]?[pending[0][7],pending[0][8]]:hfMediaDrive_('drive/v3/files/generateIds?count=2&space=drive').ids;
  queue.getRange(row,7,1,3).setValues([['UPLOADING',ids[0],ids[1]]]);SpreadsheetApp.flush();
  hfMediaFile_(issueFolder,ids[0],now.replace(/[:.]/g,'-')+'_'+b.requestId+'.jpg',b.mime,bytes);
  var label=String(b.actor.sub).split('|').slice(1).join('|')||'담당자';
  hfMediaFile_(issueFolder,ids[1],now.replace(/[:.]/g,'-')+'_'+b.requestId+'_메모.txt','text/plain',Utilities.newBlob([target.job,b.issueTitle,now,label,b.memo].join('\n')).getBytes());
  var read=hfMediaDrive_('drive/v3/files/'+ids[0]+'?alt=media',{raw:true}),check=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,read.getBlob().getBytes()).map(function(x){return ('0'+(x&255).toString(16)).slice(-2);}).join('');if(check!==b.hash)throw Error('media_corrupt');
  index=hfMediaTable_(ss,HF_MEDIA.index,HF_MEDIA.headers,true);
  var record=[b.requestId,target.id,target.job,b.issueId,b.issueTitle,now,b.takenAt||'',b.actor.sub,label,b.memo,ids[0],ids[1],b.mime,b.hash,issueFolder,'STORED'];
  var requests=[{appendCells:{sheetId:index.getSheetId(),rows:[{values:record.map(function(v){return {userEnteredValue:{stringValue:String(v)}};})}],fields:'userEnteredValue'}},hfLsCell_(queue.getSheetId(),row-1,6,'STORED')];
  hfLsBatch_(ss,requests);var stored=hfMediaFreshRows_(ss,HF_MEDIA.index,'P').filter(function(r){return r[0]===b.requestId;});if(stored.length!==1||stored[0][13]!==b.hash)throw Error('media_pending');return {ok:true,status:'STORED',entry:hfMediaView_(stored[0])};
 }catch(e){queue.getRange(row,10).setValue(/^(media_[a-z_]+|request_conflict)$/.test(e.message)?e.message:'media_unavailable');throw e;}
}
function hfLightMediaDispatch_(body){
 var ss=SpreadsheetApp.openById(HF_SPREADSHEET_ID),b=hfLsActor_(body,ss),target=hfMediaTarget_(ss,b.orderId);
 var permitted=ss.getSheetByName('HF_SYS_권한관리').getRange(1,1,ss.getSheetByName('HF_SYS_권한관리').getLastRow(),3).getDisplayValues().filter(function(r){return r[1].toLowerCase()===b.actor.email&&/^(Owner|Writer\b|Reader\b)/i.test(r[2]);});
 if(b.action==='media-save'&&(permitted.length!==1||!/^(Owner|Writer\b)/i.test(permitted[0][2])))throw Error('forbidden');
 if(b.action==='media-save'){var lock=LockService.getScriptLock();if(!lock.tryLock(8000))throw Error('busy');try{return hfMediaSave_(ss,b,body,target);}finally{lock.releaseLock();}}
 var rows=hfMediaRows_(hfMediaTable_(ss,HF_MEDIA.index,HF_MEDIA.headers,false),16).filter(function(r){return r[1]===target.id&&r[15]==='STORED';});
 if(b.action==='media-list')return {ok:true,projectId:target.id,ready:!!PropertiesService.getScriptProperties().getProperty('HF_MEDIA_ROOT'),entries:rows.map(hfMediaView_).sort(function(a,c){return a.at.localeCompare(c.at);})};
 var hits=rows.filter(function(r){return r[0]===b.requestId;});if(hits.length>1)throw Error('request_conflict');if(!hits.length){if(b.action==='media-receipt')return {ok:true,status:'NOT_CONFIRMED'};throw Error('media_missing');}
 if(b.action==='media-receipt')return {ok:true,status:'STORED',entry:hfMediaView_(hits[0])};
 if(b.action!=='media-get')throw Error('unsupported_operation');
 var image=hfMediaDrive_('drive/v3/files/'+hits[0][10]+'?alt=media',{raw:true}).getBlob().getBytes();
 var hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,image).map(function(x){return ('0'+(x&255).toString(16)).slice(-2);}).join('');
 if(image.length>1000000||hash!==hits[0][13]||hits[0][12]!=='image/jpeg')throw Error('media_corrupt');return {ok:true,mime:hits[0][12],data:Utilities.base64Encode(image)};
}
// Run only after the narrow Drive file scope is approved. Does not touch work records.
function setupHandsFreeMediaFolder(){
 var lock=LockService.getScriptLock();if(!lock.tryLock(8000))throw Error('busy');try{
 var props=PropertiesService.getScriptProperties(),existing=props.getProperty('HF_MEDIA_ROOT');
 if(existing){hfMediaDrive_('drive/v3/files/'+existing+'?fields=id');console.log(JSON.stringify({ok:true,alreadyConfigured:true}));return;}
 var matches=hfMediaDrive_('drive/v3/files?q='+encodeURIComponent("trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='hfKey' and value='handsfree-media-root-v1' }")+'&fields=files(id)&pageSize=2').files||[];
 if(matches.length>1)throw Error('request_conflict');
 var folder=matches[0]||hfMediaDrive_('drive/v3/files?fields=id',{method:'post',contentType:'application/json',payload:JSON.stringify({name:'HandsFree_장비사진이력',mimeType:'application/vnd.google-apps.folder',appProperties:{hfKey:'handsfree-media-root-v1'}})});
 props.setProperty('HF_MEDIA_ROOT',folder.id);console.log(JSON.stringify({ok:true,privateFolderCreated:true}));
 }finally{lock.releaseLock();}
}
