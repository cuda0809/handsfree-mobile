import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('detail opens outside native modal top layer and Escape/close remains available',()=>{
 const source=fs.readFileSync('kmt-sa2/mobile.js','utf8');
 assert.doesNotMatch(source,/\.showModal\(/);
 let shows=0,closes=0,keyHandler,voiceStops=0;
 const target={},sheet={innerHTML:''},dialog={open:false,scrollTop:40,show(){shows++;this.open=true;},close(){closes++;this.open=false;}};
 const c=vm.createContext({document:{activeElement:target,addEventListener:(name,f)=>{if(name==='keydown')keyHandler=f;}},dialog,$:()=>sheet,stopVoice:()=>voiceStops++,returnFocus:null});
 vm.runInContext(source.slice(source.indexOf('function open(html)'),source.indexOf("dialog.addEventListener('click'")),c);
 c.open('first');assert.equal(dialog.open,true);assert.equal(shows,1);assert.equal(sheet.innerHTML,'first');assert.equal(dialog.scrollTop,0);assert.equal(c.returnFocus,target);
 c.open('nested editor');assert.equal(shows,1);assert.equal(sheet.innerHTML,'nested editor');assert.equal(voiceStops,2);
 let prevented=false;keyHandler({key:'Escape',preventDefault(){prevented=true;}});assert.equal(closes,1);assert.equal(dialog.open,false);assert.equal(prevented,true);
 c.open('reopen');assert.equal(shows,2);
 assert.match(fs.readFileSync('kmt-sa2/hybrid05.css','utf8'),/#detail\[open\]\{[^}]*position:fixed[^}]*overflow-y:auto/);
});
test('late detail-close event never steals a following navigation click or scrolls the page',()=>{
 const source=fs.readFileSync('kmt-sa2/mobile.js','utf8'),code=source.match(/dialog\.addEventListener\('close',[^\n]+/)[0];
 for(const followingNav of [false,true]){
  let listener,focusCalls=0,options;
  const body={},nav={},target={isConnected:true,focus:o=>{focusCalls++;options=o;}};
  const c=vm.createContext({document:{body,activeElement:followingNav?nav:body},dialog:{open:false,contains:()=>false,addEventListener:(_,f)=>listener=f},returnFocus:target,stopVoice(){}});
  vm.runInContext(code,c);listener();assert.equal(focusCalls,followingNav?0:1);if(!followingNav)assert.equal(options.preventScroll,true);assert.equal(c.returnFocus,null);
 }
});
test('status refresh leaves navigation touch targets attached in their current position',()=>{
 const source=fs.readFileSync('kmt-sa2/mobile.js','utf8');let moves=0;
 const span={},demo={innerHTML:'',querySelector:()=>span,after:()=>moves++},status={previousElementSibling:demo,replaceChildren(){}},nav={previousElementSibling:status};
 const c=vm.createContext({document:{querySelector:s=>s==='.demo'?demo:s==='.bottom'?nav:status},BUILD:'test',live:true,readMessage:'fresh',esc:s=>s});
 vm.runInContext(source.slice(source.indexOf('function banner('),source.indexOf('async function refresh(')),c);
 for(let i=0;i<30;i++)c.banner();assert.equal(moves,0);
});
test('card classification reuses one date formatter and rolls over at Seoul midnight',()=>{
 let constructed=0;
 const c=vm.createContext({Intl:{DateTimeFormat:class {constructor(...args){constructed++;this.formatter=new Intl.DateTimeFormat(...args);}format(d){return this.formatter.format(d);}}},Date,module:{exports:{}}});
 vm.runInContext(fs.readFileSync('kmt-sa2/production-rules.js','utf8'),c);
 const rules=c.module.exports;
 for(let i=0;i<1000;i++)assert.equal(rules.today(new Date('2026-10-07T14:59:59Z')),'2026-10-07');
 assert.equal(rules.today(new Date('2026-10-07T15:00:00Z')),'2026-10-08');assert.equal(constructed,1);
 const source=fs.readFileSync('kmt-sa2/app-flow.js','utf8');
 for(const name of ['currentProductionRows','displayedNextAction','dueUrgency','productionClass']){
  const start=source.indexOf('function '+name+'('),end=source.indexOf('\nfunction ',start+1),body=source.slice(start,end);
  assert.match(body,/HfProductionRules\.today\(/);assert.doesNotMatch(body,/toLocaleDateString/);
 }
});
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
