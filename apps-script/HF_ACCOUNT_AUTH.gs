/* Username/password accounts. Password derivation occurs only on the trusted server.
 * Private properties only; no operational Sheet writes. Existing legacy sessions survive.
 * Signup is pending review: knowing a roster name never grants that person's authority.
 */
function hfAccountKey_(username){if(!/^[a-z0-9][a-z0-9._-]{3,31}$/.test(username||''))throw Error('invalid_username');return 'HF_ACCOUNT_V1_'+username;}
function hfAccountRead_(username){var raw=PropertiesService.getScriptProperties().getProperty(hfAccountKey_(username));if(!raw)throw Error('account_denied');return JSON.parse(raw);}
function hfAccountSave_(a){PropertiesService.getScriptProperties().setProperty(hfAccountKey_(a.username),JSON.stringify(a));}
function hfAccountAuth_(ss,b){
 var props=PropertiesService.getScriptProperties(),action=b.action,snapshot=hfMemberRows_(ss);
 if(action==='account-self'){var me=hfMemberActive_(ss,b.member);return {ok:true,username:props.getProperty('HF_ACCOUNT_MEMBER_'+me.id)||''};}
 if(action==='account-signup'){
  var key=hfAccountKey_(b.username);if(props.getProperty(key))throw Error('username_taken');
  var hit=hfMemberFind_(snapshot,1,String(b.name||'')),r=hit.row;
  // Bound pending storage to the known roster; no unbounded public account creation.
  if(props.getProperty('HF_ACCOUNT_MEMBER_'+r[0]))throw Error('member_account_exists');
  hfAccountCredentials_(b);
  var a={username:b.username,memberId:r[0],salt:b.salt,hash:b.hash,status:'PENDING',version:1,failures:0,lockedUntil:0,createdAt:new Date().toISOString()};
  hfAccountSave_(a);props.setProperty('HF_ACCOUNT_MEMBER_'+r[0],a.username);
  return {ok:true,pending:true};
 }
 if(action==='account-pending'){
  var owner=hfMemberActive_(ss,b.member);if(!owner.isMaster)throw Error('master_required');
  return {ok:true,accounts:snapshot.rows.map(function(r){var u=props.getProperty('HF_ACCOUNT_MEMBER_'+r[0]);if(!u)return null;var a=hfAccountRead_(u);return {username:u,memberId:r[0],name:r[1],status:a.status};}).filter(Boolean)};
 }
 if(action==='account-approve'||action==='account-reject'){
  if(!hfMemberActive_(ss,b.member).isMaster)throw Error('master_required');
  return hfAccountReview_(ss,b.username,action==='account-approve');
 }
 var a=hfAccountRead_(b.username);if(a.lockedUntil>Date.now())throw Error('member_locked');
 if(action==='account-lookup')return {ok:true,account:{memberId:a.memberId,salt:a.salt,hash:a.hash,version:a.version}};
 if(action==='account-failure'){
  a.failures++;if(a.failures>=5){a.lockedUntil=Date.now()+600000;a.failures=0;}hfAccountSave_(a);throw Error('account_denied');
 }
 if(!hfMemberSame_(b.proof,a.hash)||b.expected!==a.version)throw Error('account_denied');
 if(a.status!=='ACTIVE')throw Error(a.status==='PENDING'?'account_pending':'account_denied');
 var member=hfMemberFind_(snapshot,0,a.memberId).row;
 if(member[4]!=='ACTIVE')throw Error('account_denied');
 if(action==='account-change'){
  var p=hfMemberActive_(ss,b.member);if(p.id!==a.memberId)throw Error('account_denied');
  hfAccountCredentials_(b);a.salt=b.salt;a.hash=b.hash;a.version++;member[5]=String(Number(member[5])+1);member[12]=new Date().toISOString();hfMemberSave_(snapshot,{row:member,index:snapshot.rows.indexOf(member)+2});
 }else if(action!=='account-success')throw Error('invalid_request');
 a.failures=0;a.lockedUntil=0;hfAccountSave_(a);return {ok:true,member:hfMemberPublic_(member)};
}
function hfAccountCredentials_(b){if(!/^[A-Za-z0-9_-]{22}$/.test(b.salt||'')||!(/^[A-Za-z0-9_-]{43}$/).test(b.hash||''))throw Error('invalid_password');}
function hfAccountReview_(ss,username,approve){
 var props=PropertiesService.getScriptProperties(),a=hfAccountRead_(username);if(a.status!=='PENDING')throw Error('stale_record');
 var snapshot=hfMemberRows_(ss),hit=hfMemberFind_(snapshot,0,a.memberId),r=hit.row;
 props.setProperty('HF_ACCOUNT_REVIEW_ROLLBACK',JSON.stringify({account:a,member:r}));
 if(!approve){props.deleteProperty(hfAccountKey_(username));props.deleteProperty('HF_ACCOUNT_MEMBER_'+r[0]);return {ok:true};}
 a.status='ACTIVE';a.version++;r[4]='ACTIVE';r[5]=String(Number(r[5])+1);r[12]=new Date().toISOString();hfMemberSave_(snapshot,hit);hfAccountSave_(a);
 return {ok:true,member:hfMemberPublic_(r)};
}
// Operator-only bootstrap after the owner personally submits their chosen credentials.
// Never exposed by doGet/doPost; never guesses an ID or creates a password.
function approveHandsFreeMasterAccount(){
 var lock=LockService.getScriptLock();if(!lock.tryLock(8000))throw Error('busy');
 try{var props=PropertiesService.getScriptProperties(),snapshot=hfMemberRows_(null),r=hfMemberFind_(snapshot,0,'HFU-007').row;
 if(!hfMemberPublic_(r).isMaster)throw Error('owner_protected');
 var username=props.getProperty('HF_ACCOUNT_MEMBER_HFU-007');if(!username)throw Error('owner_signup_required');
 return hfAccountReview_(null,username,true);
 }finally{lock.releaseLock();}
}
