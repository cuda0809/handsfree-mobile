/* Individual employee credentials. No business-state writes. One-use invitations are hashed. */
var HF_MEMBER={sheet:'HF_AUTH_사용자',headers:['Member_ID','Name','Team','Role','Status','Version','Pin_Salt','Pin_Hash','Invite_Hash','Invite_Expires','Failures','Locked_Until','Updated_At']};
function hfMemberEnabled_(){return PropertiesService.getScriptProperties().getProperty('HF_MEMBER_AUTH_OPEN')==='OPEN';}
function hfMemberRows_(ss){var raw=PropertiesService.getScriptProperties().getProperty('HF_MEMBER_REGISTRY_V1'),registry;try{registry=JSON.parse(raw||'');}catch(e){throw Error('member_auth_not_ready');}if(registry.schema!==1||!Array.isArray(registry.rows))throw Error('member_auth_not_ready');return {rows:registry.rows};}
function hfMemberSave_(snapshot,hit){snapshot.rows[hit.index-2]=hit.row;var value=JSON.stringify({schema:1,rows:snapshot.rows});if(Utilities.newBlob(value).getBytes().length>8000)throw Error('member_auth_not_ready');PropertiesService.getScriptProperties().setProperty('HF_MEMBER_REGISTRY_V1',value);}
function hfMemberPublic_(r){return {id:r[0],name:r[1],team:r[2],role:r[3],status:r[4],version:Number(r[5])};}
function hfMemberSame_(a,b){a=String(a);b=String(b);if(a.length!==b.length)return false;var d=0;for(var i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
function hfMemberFind_(snapshot,key,value){var hits=[];snapshot.rows.forEach(function(r,i){if(r[key]===value)hits.push({row:r,index:i+2});});if(hits.length!==1)throw Error('member_denied');return hits[0];}
function hfMemberLocked_(r){if(Number(r[11])>Date.now())throw Error('member_locked');}
function hfMemberFailure_(snapshot,hit){var r=hit.row;r[10]=String(Number(r[10]||0)+1);if(Number(r[10])>=5){r[11]=String(Date.now()+10*60*1000);r[10]='0';}r[12]=new Date().toISOString();hfMemberSave_(snapshot,hit);throw Error('member_denied');}
function hfMemberActive_(ss,identity){if(!identity||typeof identity.id!=='string'||!Number.isInteger(identity.version))throw Error('registration_required');var r=hfMemberFind_(hfMemberRows_(ss),0,identity.id).row;if(r[4]!=='ACTIVE'||Number(r[5])!==identity.version)throw Error('member_session_revoked');if(['master','factory_manager','team_lead','member'].indexOf(r[3])<0||['ALL','A','B'].indexOf(r[2])<0)throw Error('member_denied');if(r[3]==='master'&&(r[0]!=='HFU-007'||r[1]!=='이상준'||r[2]!=='ALL'))throw Error('member_denied');return hfMemberPublic_(r);}
function hfMemberActor_(ss,b){
 if(!hfMemberEnabled_())return b;
 if(!b.actor.member){if(['core','plans','catalog','reports','history','receipt','issue','media-list','media-get','media-receipt'].indexOf(b.action)>=0)return b;throw Error('registration_required');}
 var p=hfMemberActive_(ss,b.actor.member);if(b.actor.sub!=='member-'+p.id+'|'+p.name)throw Error('member_denied');b.actor.access=p;b.actor.queueIdentity=p.id+'|'+p.name;return b;
}
function hfMemberWrite_(ss,b,job,kind){
 if(!hfMemberEnabled_())return;
 var p=hfMemberActive_(ss,b.actor.member);if(p.role==='master'||p.role==='factory_manager')return;
 if(!job){if(kind==='journal')return;throw Error('forbidden');}
 var sh=ss.getSheetByName('HF_CORE_통합운영'),rows=sh.getRange(2,1,sh.getLastRow()-1,3).getDisplayValues().filter(function(r){return r[1]===job;});
 if(rows.length!==1||rows[0][2]!==p.team)throw Error('team_forbidden');
 // Members record progress/photos; corrections to shared schedules/state require a team lead.
 if((kind==='schedule'||kind==='state')&&p.role!=='team_lead')throw Error('team_lead_required');
}
function hfMemberRequester_(actor){return actor.queueIdentity||actor.email;}
function hfMemberJournal_(body,ss){
 if(!hfMemberEnabled_())return;
 var b=hfLsActor_(body.memberProof||{},ss);if(b.action!=='journal-write'||b.text!==body.text||b.targetHint!==String(body.targetHint||''))throw Error('member_denied');
 var source=String(b.source||'');
 if(source!==String(body.source||''))throw Error('member_denied');
 if(b.targetHint==='GENERAL_ISSUE'&&source.split('|').indexOf('GENERAL_EVENT')>=0){hfMemberWrite_(ss,b,'','journal');}
 else{
  var hints=String(b.targetHint||'').match(/^(?:LAB-)?\d{6}[A-Z]-\d{3}(?:-\d{2})?$/),inText=String(b.text||'').match(/(?:LAB-)?\d{6}[A-Z]-\d{3}(?:-\d{2})?/g)||[];
  if(!hints||source.split('|').indexOf('UNIFIED_EVENT')<0)throw Error('project_mismatch');
  var jobs=[hints[0]].concat(inText).filter(function(x,i,a){return a.indexOf(x)===i;});jobs.forEach(function(job){hfMemberWrite_(ss,b,job,'journal');});
 }
 body.requester=hfMemberRequester_(b.actor);body.source='MOBILE|'+(b.targetHint==='GENERAL_ISSUE'?'GENERAL_EVENT':'UNIFIED_EVENT')+'|SA2:'+b.actor.access.name;
}
function hfLightAuthDispatch_(body){
 var token=PropertiesService.getScriptProperties().getProperty(HF_TOKEN_KEY),signed=body.signed,signature=body.signature;
 if(!token||typeof signed!=='string'||signed.length>4000||typeof signature!=='string')throw Error('member_denied');
 var mac=Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(signed,token,Utilities.Charset.UTF_8)).replace(/=+$/,'');if(!hfMemberSame_(mac,signature))throw Error('member_denied');
 var b=JSON.parse(signed);if(!Number.isFinite(b.at)||Math.abs(Date.now()-b.at)>120000||typeof b.nonce!=='string')throw Error('member_denied');
 if(b.action==='status')return {ok:true,enabled:hfMemberEnabled_()};
 if(!hfMemberEnabled_())throw Error('member_auth_not_ready');
 var ss=SpreadsheetApp.openById(HF_SPREADSHEET_ID),lock=LockService.getScriptLock();if(!lock.tryLock(8000))throw Error('busy');try{
  if(b.action==='check')return {ok:true,member:hfMemberActive_(ss,b.member)};
  var snapshot=hfMemberRows_(ss),hit=hfMemberFind_(snapshot,b.action==='lookup'?1:0,b.action==='lookup'?String(b.name||''):String(b.id||'')),r=hit.row;hfMemberLocked_(r);
  if(b.action==='lookup'){var out=hfMemberPublic_(r);if(r[4]==='ACTIVE'){out.salt=r[6];out.hash=r[7];}return {ok:true,member:out};}
  if(Number(b.expected)!==Number(r[5]))throw Error('member_denied');
  if(b.action==='enroll'){
   if(r[4]!=='INVITED'||Date.now()>Number(r[9])||!hfMemberSame_(b.codeHash,r[8]))return hfMemberFailure_(snapshot,hit);
   if(!/^[A-Za-z0-9_-]{22}$/.test(b.salt||'')||!(/^[A-Za-z0-9_-]{43}$/).test(b.hash||''))throw Error('member_denied');
   r[4]='ACTIVE';r[5]=String(Number(r[5])+1);r[6]=b.salt;r[7]=b.hash;r[8]='';r[9]='';
  }else if(b.action==='login-success'){
   if(r[4]!=='ACTIVE'||!hfMemberSame_(b.proof,r[7]))return hfMemberFailure_(snapshot,hit);
  }else if(b.action==='login-failure')return hfMemberFailure_(snapshot,hit);else throw Error('member_denied');
  r[10]='0';r[11]='0';r[12]=new Date().toISOString();hfMemberSave_(snapshot,hit);SpreadsheetApp.flush();return {ok:true,member:hfMemberPublic_(r)};
 }finally{lock.releaseLock();}
}
