/* Private public-key records only. No biometric data or business rows. */
function hfMemberDevice_(ss,b){
 var owner=hfMemberActive_(ss,b.member);if(!owner.isMaster)throw Error('master_required');
 var props=PropertiesService.getScriptProperties(),key='HF_MASTER_DEVICE_'+owner.id,raw=props.getProperty(key),record=raw?JSON.parse(raw):{version:owner.version};
 if(record.version!==owner.version)record={version:owner.version};
 if(b.action==='device-get')return {ok:true,device:record.device||null};
 if(b.action==='device-pending')return {ok:true,pending:record.pending||null};
 if(b.action==='device-challenge'){
  if(!/^[A-Za-z0-9_-]{16,200}$/.test(b.challenge||'')||['register','unlock'].indexOf(b.kind)<0||!/^https:\/\/[^/]+$/.test(b.origin||''))throw Error('device_denied');
  record.pending={challenge:b.challenge,kind:b.kind,origin:b.origin,expires:Date.now()+120000};
 }else{
  var pending=record.pending;if(!pending||pending.challenge!==b.challenge||pending.expires<Date.now())throw Error('challenge_expired');
  if(b.action==='device-save'){
   var d=b.device;if(pending.kind!=='register'||record.device||!d||!/^[A-Za-z0-9_-]{16,1500}$/.test(d.id||'')||!/^[A-Za-z0-9_-]{16,2000}$/.test(d.publicKey||'')||!Number.isInteger(d.counter)||d.counter<0)throw Error('device_denied');
   record.device={id:d.id,publicKey:d.publicKey,counter:d.counter,transports:Array.isArray(d.transports)?d.transports.slice(0,5):[]};
  }else if(b.action==='device-counter'){
   if(pending.kind!=='unlock'||!record.device||record.device.id!==b.id||record.device.counter!==b.expected||!Number.isInteger(b.counter)||b.counter<0||((record.device.counter>0||b.counter>0)&&b.counter<=record.device.counter))throw Error('device_denied');
   record.device.counter=b.counter;
  }else throw Error('invalid_request');
  delete record.pending;
 }
 var value=JSON.stringify(record);if(Utilities.newBlob(value).getBytes().length>8000)throw Error('device_denied');props.setProperty(key,value);return {ok:true};
}
