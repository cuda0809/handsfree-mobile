/**
 * HandsFree REAL 0.8 — Mobile SAFE WRITE Bridge V1
 * Same Apps Script project as HF_REAL_LIVE_READ_V2 + HF_REAL_SAFE_WRITE_V081.
 */
function doPost(e){
  try{
    const expected=PropertiesService.getScriptProperties().getProperty(HF_TOKEN_KEY);
    const body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    const supplied=String(body.token||'');
    if(!expected||supplied!==expected)return json_({ok:false,schema:HF_SCHEMA,error:'unauthorized'});
    if(String(body.op||'')!=='safe_write')return json_({ok:false,schema:HF_SCHEMA,error:'unsupported_operation'});
    const raw=String(body.text||'').trim().slice(0,1000);if(!raw)return json_({ok:false,schema:HF_SCHEMA,error:'empty_text'});
    const requester=String(body.requester||'Emotion').trim().slice(0,80),channel=String(body.source||'MOBILE').trim().slice(0,40);
    const ss=SpreadsheetApp.openById(HF_SW.SSID);assertStructure_(ss);
    if(!fieldOpen_(ss))return json_({ok:false,schema:HF_SCHEMA,error:'safe_write_not_ready',ack:'Field Input Safe Write가 OPEN이 아닙니다.'});
    const q=getSheet_(ss,HF_SW.SHEET.QUEUE,HF_SW.ID.QUEUE),now=new Date(),day=Utilities.formatDate(now,HF_SW.TZ,'yyyyMMdd');
    const dedupe=sha256_(['FIELD_INPUT',day,norm_(raw)].join('|')),prior=findDedupe_(q,dedupe);
    if(prior)return json_({ok:true,schema:HF_SCHEMA,applied:false,status:'DUPLICATE',requestId:String(q.getRange(prior,1).getDisplayValue()||''),ack:'동일 내용이 오늘 이미 등록되어 중복 반영하지 않았습니다.'});
    const requestId='HF-'+Utilities.formatDate(now,HF_SW.TZ,'yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().slice(0,8);
    const payload=JSON.stringify({version:HF_SW.VERSION,source:'FIELD_INPUT',inputSheet:'MOBILE',inputRow:0,raw,channel,requester,targetHint:String(body.targetHint||'').trim().slice(0,200)});
    const queueRow=appendQueue_(q,[requestId,dt_(now),'FIELD_INPUT',requester||'MOBILE_USER',payload,'QUEUED',dedupe,0,'','','','','',priority_(raw),'모바일 Queue 등록']);
    processHandsFreeSafeWriteQueue();SpreadsheetApp.flush();
    const qStatus=String(q.getRange(queueRow,6).getDisplayValue()||''),qResult=String(q.getRange(queueRow,12).getDisplayValue()||''),qError=String(q.getRange(queueRow,13).getDisplayValue()||''),qAck=String(q.getRange(queueRow,15).getDisplayValue()||'');
    const norm=getSheet_(ss,HF_SW.SHEET.NORM,HF_SW.ID.NORM),last=norm.getLastRow();let statuses=[],matchedIssueId='',orderId='';
    if(last>=2){norm.getRange(2,1,last-1,20).getDisplayValues().forEach(r=>{if(String(r[0]||'').indexOf(requestId+'-E')===0){statuses.push(String(r[17]||''));const link=String(r[15]||'');if(/^ISS-\d{8}-\d{3}$/i.test(link))matchedIssueId=link.toUpperCase();else if(link)orderId=link;}});}
    const finalStatus=statuses.includes('FAILED')?'FAILED':statuses.includes('REVIEW')?'REVIEW':statuses.includes('EXCLUDED')?'EXCLUDED':statuses.includes('WRITTEN')?'WRITTEN':qStatus;
    const applied=statuses.includes('WRITTEN');
    if(qStatus==='FAILED'||finalStatus==='FAILED')return json_({ok:false,schema:HF_SCHEMA,error:qError||'safe_write_failed',status:finalStatus,requestId,ack:qAck||qResult});
    return json_({ok:true,schema:HF_SCHEMA,applied,status:finalStatus,requestId,matchedIssueId,orderId,ack:qAck||qResult||finalStatus});
  }catch(err){return json_({ok:false,schema:typeof HF_SCHEMA==='undefined'?'HF_REAL':HF_SCHEMA,error:String(err&&err.message?err.message:err)});}
}
