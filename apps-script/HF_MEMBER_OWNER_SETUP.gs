/* Operator-run owner setup. Never executes through a web endpoint.
 * Run only after explicit approval for owner-only migration. No operating data writes.
 * Registry rollback is retained. Existing accounts are never overwritten.
 */
function prepareHandsFreeOwnerOnly() {
 var props=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock();
 if(!lock.tryLock(8000))throw Error('busy');
 try{
  if(props.getProperty('HF_MEMBER_AUTH_OPEN')==='OPEN')throw Error('already_open');
  if(props.getProperty('HF_MEMBER_REGISTRY_V1'))throw Error('registry_exists_review_required');
  var roster=[['001','이기종','ALL','factory_manager'],['002','하문식','A','team_lead'],['003','김경복','A','member'],['004','장명삼','A','member'],['005','이기성','A','member'],['006','김윤진','A','member'],['007','이상준','B','team_lead'],['008','이성호','B','member'],['009','조용인','B','member'],['010','장현준','B','member'],['011','김은국','B','member'],['012','노진호','B','member']];
  var now=Date.now(),code=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'').slice(0,24).toUpperCase();
  var hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,code,Utilities.Charset.UTF_8).map(function(n){return ('0'+((n+256)%256).toString(16)).slice(-2);}).join('');
  var rows=roster.map(function(p){var owner=p[0]==='007';return ['HFU-'+p[0],p[1],p[2],p[3],owner?'INVITED':'BLOCKED','1','','',owner?hash:'',owner?String(now+7*86400000):'','0','0',new Date(now).toISOString(),owner?'MASTER':''];});
  props.setProperty('HF_MEMBER_REGISTRY_V1',JSON.stringify({schema:1,rows:rows}));
  // One-time delivery material is private, never part of logs or API responses.
  props.setProperty('HF_MEMBER_OWNER_INVITE_ONCE',code);
  return {ok:true,owner:'HFU-007',team:'B',role:'team_lead',isMaster:true,gate:'CLOSED',others:'BLOCKED'};
 }finally{lock.releaseLock();}
}
function activateHandsFreeOwnerOnly(){
 var props=PropertiesService.getScriptProperties(),snapshot=hfMemberRows_(null),owner=hfMemberFind_(snapshot,0,'HFU-007').row;
 if(snapshot.rows.length!==12||snapshot.rows.some(function(r){return r[0]!=='HFU-007'&&r[4]!=='BLOCKED';}))throw Error('rollout_scope_changed');
 if(!hfMemberPublic_(owner).isMaster||owner[4]!=='INVITED'||Date.now()>Number(owner[9]))throw Error('owner_not_ready');
 props.setProperty('HF_MEMBER_AUTH_PHASE','OWNER_ONLY');
 props.setProperty('HF_MEMBER_AUTH_OPEN','OPEN');
 return {ok:true,gate:'OPEN',owner:'HFU-007',others:'BLOCKED'};
}
