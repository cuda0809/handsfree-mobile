import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',value:'',hidden:false,open:false,isConnected:true,dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return []},querySelector(){return node('query')},appendChild(){},append(){},setAttribute(){},insertAdjacentHTML(where,html){this.innerHTML+=html},showModal(){this.open=true},close(){this.open=false},focus(){},scrollIntoView(){}});return nodes.get(id)};
const listeners={};let monotonic=1000;const c={console,Date,Map,Set,Promise,Number,String,Object,Array,JSON,Math,Error,RegExp,structuredClone,performance:{now:()=>monotonic},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,fetch:async()=>({ok:true,status:200,json:async()=>({now:Date.parse('2026-10-01T03:30:00Z'),expiresAt:Date.parse('2026-10-11T10:30:00+09:00')})}),matchMedia:()=>({matches:false,addEventListener(){}}),navigator:{onLine:true},localStorage:{getItem:()=>null,setItem(){throw Error('Unexpected persistence')},removeItem(){}},crypto:{randomUUID:()=> 'test-id'},document:{getElementById:node,querySelector:s=>node(s),querySelectorAll:()=>[],createElement:()=>node('created'),head:{append(){}},addEventListener(){},visibilityState:'visible'},addEventListener(type,fn){listeners[type]=fn}};c.window=c;vm.createContext(c);
for(const name of ['guest-data.js','mobile.js','schedule.js','app-flow.js','hybrid-ui.js','guest-mode.js'])vm.runInContext(fs.readFileSync(name,'utf8'),c,{filename:name});
await vm.runInContext('guestReady',c);await vm.runInContext('refresh()',c);
assert.match(node('.bottom').innerHTML,/오늘/);for(const text of ['납기','프로젝트','내 기록'])assert.match(node('.bottom').innerHTML,new RegExp(text));assert.doesNotMatch(node('.bottom').innerHTML,/그로우|입력/);
assert.match(node('main').innerHTML,/오늘 확인할 일/);assert.match(node('main').innerHTML,/공정 신호/);assert.match(node('.demo').innerHTML,/Hybrid 0.5/);
await vm.runInContext('hybridDelivery()',c);assert.match(node('hybridDeliveryRows').innerHTML,/AMP 20K/);
await vm.runInContext('hybridProjects()',c);assert.match(node('hybridProjectRows').innerHTML,/DEMO-KRM100D/);
await vm.runInContext("openProject('DEMO-AMP20K')",c);assert.match(node('hybridProjectDetail').innerHTML,/전체 제작 일정/);assert.match(node('hybridProjectDetail').innerHTML,/진행 이력/);assert.match(node('hybridProjectDetail').innerHTML,/운영 기록이 아닙니다/);
vm.runInContext('input()',c);assert.match(node('sheetBody').innerHTML,/입력·수정 기능 잠김/);
await assert.rejects(vm.runInContext("guestApi('/api/sa2-app',{action:'edit'})",c),e=>e.status===403);
vm.runInContext('hybridRecords()',c);assert.match(node('main').innerHTML,/입력 기록이 없습니다/);
monotonic=1e15;vm.runInContext('guestExpire()',c);assert.equal(node('app').hidden,true);assert.equal(node('guestExpired').hidden,false);assert.equal(node('detail').open,false);assert.equal(node('sheetBody').innerHTML,'');
console.log('PASS: Hybrid 0.5 four tabs, priority home, delivery, project search/detail/plans/history, readonly input and API, records, expired dialog cleanup.');


