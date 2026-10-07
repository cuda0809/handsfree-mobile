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
test('untrusted, insecure, different-execution and authentication redirects are rejected before another request',async()=>{
 for(const location of ['https://example.invalid/','http://script.googleusercontent.com/','https://accounts.google.com/','https://script.google.com/macros/s/different/exec']){
  const f=fixture([{status:302,headers:{location}}]);await assert.rejects(readAppsScript('https://script.google.com/macros/s/fixture/exec',{},1000,f.request),/upstream_invalid_redirect/);assert.equal(f.calls.length,1);
 }
});
test('same-execution ingress redirect preserves authenticated READ and nonce avoids cached one-time redirects',async()=>{
 const f=fixture([{status:302,headers:{location:'https://script.google.com/macros/s/fixture/exec?ingress=1'}},{status:302,headers:{location:'https://script.googleusercontent.com/macros/echo?fixture=2'}},{text:'{"ok":true}'}]);
 await readAppsScript('https://script.google.com/macros/s/fixture/exec',{token:'isolated-fixture'},1000,f.request);
 assert.ok(new URL(f.calls[0].url).searchParams.get('hf_read_request'));
 assert.deepEqual(f.calls.map(x=>x.method),['POST','POST','GET']);assert.equal(f.calls[1].body,f.calls[0].body);assert.equal(f.calls[2].body,undefined);
 for(const call of f.calls)assert.equal(call.headers['Cache-Control'],'no-cache, no-store');
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

test('expired result URL is recovered once with a new read nonce and never replays credentials to result host',async()=>{
 const f=fixture([{status:302,headers:{location:'https://script.googleusercontent.com/macros/echo?first=1'}},{status:404,text:'gone'},{status:302,headers:{location:'https://script.googleusercontent.com/macros/echo?second=1'}},{text:'{"ok":true}'}]);
 assert.equal((await readAppsScript('https://script.google.com/macros/s/fixture/exec',{token:'fixture'},1000,f.request)).ok,true);
 assert.deepEqual(f.calls.map(c=>c.method),['POST','GET','POST','GET']);assert.notEqual(f.calls[0].url,f.calls[2].url);
 for(const c of f.calls.filter(c=>c.method==='GET'))assert.equal(c.body,undefined);
 const bad=fixture([{status:302,headers:{location:'https://script.googleusercontent.com/macros/echo?first=1'}},{status:404},{status:302,headers:{location:'https://script.googleusercontent.com/macros/echo?second=1'}},{status:404}]);
 await assert.rejects(readAppsScript('https://script.google.com/macros/s/fixture/exec',{},1000,bad.request),e=>e.upstreamStatus===404&&e.upstreamPhase==='result');assert.equal(bad.calls.length,4);
});
