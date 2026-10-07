import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {readAppsScript} from '../lib/apps-script-read.mjs';
import {isLightRead} from '../lib/kmt-server.mjs';
function fixture(responses){
 const calls=[];
 const request=(url,options,callback)=>{
  const req=new EventEmitter();
  req.destroy=e=>req.emit('error',e);
  req.end=body=>{calls.push({url:String(url),...options,body});const spec=responses.shift();queueMicrotask(()=>{if(spec.error)return req.emit('error',spec.error);const res=Readable.from([Buffer.from(spec.text||'')]);res.statusCode=spec.status||200;res.headers=spec.headers||{};callback(res);});};
  return req;
 };
 return {request,calls};
}
test('ContentService redirect follows a GET without replaying POST or forwarding credentials',async()=>{
 const f=fixture([{status:302,headers:{location:'https://script.googleusercontent.com/macros/echo?fixture=1'}},{text:'{"ok":true,"records":[]}'}]);
 assert.equal((await readAppsScript('https://script.google.com/macros/s/fixture/exec',{token:'isolated-fixture'},1000,f.request)).ok,true);
 assert.equal(f.calls.length,2);assert.equal(f.calls[0].method,'POST');assert.match(f.calls[0].body,/isolated-fixture/);
 assert.equal(f.calls[1].method,'GET');assert.equal(f.calls[1].body,undefined);assert.equal(f.calls[1].headers['Content-Type'],undefined);
});
test('untrusted, insecure and authentication redirects are rejected before another request',async()=>{
 for(const location of ['https://example.invalid/','http://script.googleusercontent.com/','https://accounts.google.com/','https://script.google.com/macros/s/fixture/exec']){
  const f=fixture([{status:302,headers:{location}}]);await assert.rejects(readAppsScript('https://script.google.com/macros/s/fixture/exec',{},1000,f.request),/upstream_invalid_redirect/);assert.equal(f.calls.length,1);
 }
});
test('invalid response, rejection and network failure cannot become a fresh successful read',async()=>{
 for(const response of [{status:503,text:'<html>Unavailable</html>'},{text:'{"ok":false,"error":"forbidden"}'},{error:Object.assign(Error('connection failed'),{code:'ECONNRESET'})}]){
  const f=fixture([response]);await assert.rejects(readAppsScript('https://script.google.com/macros/s/fixture/exec',{},1000,f.request));assert.equal(f.calls.length,1);
 }
});
test('only whitelisted signed light reads select the alternate transport; writes never enter it',()=>{
 for(const action of ['core','catalog','plans','reports','history','receipt','issue'])assert.equal(isLightRead({op:'light_app',signed:JSON.stringify({action})}),true);
 for(const action of ['edit','safe_write','unknown'])assert.equal(isLightRead({op:'light_app',signed:JSON.stringify({action})}),false);
 assert.equal(isLightRead({op:'safe_write',signed:'{"action":"core"}'}),false);assert.equal(isLightRead({op:'light_app',signed:'invalid'}),false);
});
