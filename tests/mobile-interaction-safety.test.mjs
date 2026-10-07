import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('cache remains bounded across watch URLs and quota failure cannot replace a fresh response',async()=>{
 const handlers={},cache=new Map();let fail=false,offline=false;
 const fresh={ok:true,clone(){return this;},version:'new'};
 const c=vm.createContext({URL,location:{origin:'https://app.example'},Response:{error:()=>({error:true})},self:{registration:{scope:'https://app.example/kmt-sa2/'},addEventListener:(n,f)=>handlers[n]=f},caches:{open:async()=>({put:async(k,v)=>{if(fail)throw Error('quota');cache.set(k,v);},match:async k=>cache.get(k)})},fetch:async()=>{if(offline)throw Error('offline');return fresh;}});
 vm.runInContext(fs.readFileSync('kmt-sa2/sw.js','utf8'),c);
 async function request(i){let p;handlers.fetch({request:{method:'GET',url:'https://app.example/kmt-sa2/mobile.js?watch='+i},respondWith:r=>p=r});return await p;}
 for(let i=0;i<40;i++)assert.equal(await request(i),fresh);
 assert.equal(cache.size,1);fail=true;assert.equal(await request(41),fresh);offline=true;assert.equal(await request(42),fresh);
});
test('concurrent update checks never reload a screen or interrupt open editors',async()=>{
 const source=fs.readFileSync('kmt-sa2/mobile.js','utf8'),elements=new Map(),saved=[];let reloaded=0,checks=0,release;
 const gate=new Promise(r=>release=r),dialog={open:true},text={value:'draft'};
 const c=vm.createContext({document:{visibilityState:'visible',createElement:()=>({}),querySelector:s=>s==='.hf-connection-row'?{appendChild:b=>elements.set(b.id,b)}:null,querySelectorAll:()=>[text]},navigator:{onLine:true},sessionStorage:{getItem:()=> 'old',setItem:(...args)=>saved.push(args)},$:id=>elements.get(id),dialog,notes:()=>[],toast:()=>{},location:{reload:()=>reloaded++},liveAssetHash:async()=>{checks++;await gate;return 'new';}});
 vm.runInContext("const APP_ASSET_HASH_KEY='hf-ui-assets-hash-v2';let assetCheckPending=null;"+source.slice(source.indexOf('async function checkForLiveUpdate()'),source.indexOf('setTimeout(checkForLiveUpdate')),c);
 const a=c.checkForLiveUpdate(),b=c.checkForLiveUpdate();release();await Promise.all([a,b]);assert.equal(checks,1);assert.equal(reloaded,0);assert.equal(saved.length,0);
 const button=elements.get('hfUpdateAvailable');button.onclick();assert.equal(reloaded,0);dialog.open=false;button.onclick();assert.equal(reloaded,0);text.value='';button.onclick();assert.equal(reloaded,1);
});
