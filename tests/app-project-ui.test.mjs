import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../handsfree-renewal/app-flow.js',import.meta.url),'utf8');
const start=source.indexOf('function lifecycleRecords('),end=source.indexOf('const appScheduleBase',start),overview={isConnected:true,innerHTML:''},inputButton={};let opened='';
const c=vm.createContext({
 personalConnected:true,login(){throw Error('unexpected_login');},appProjects:[{orderId:'P-1',customer:'고객',model:'모델',state:'조립',due:'2026-10-20'}],items:[],
 appDay:String,esc:String,heading:()=>'',open(){},toast(){},$:id=>id==='projectOverview'?overview:id==='projectInput'?inputButton:null,progressInput:p=>opened=p.orderId,
 api:async()=>({orderId:'P-1',records:[{date:'2026-10-02',process:'조립',editable:true},{date:'2026-10-01',process:'조립',editable:true},{date:'2026-10-03',process:'전장',editable:false}]}),
 appCall:async()=>({events:[{raw:'두 번째',at:'2026-09-02',actor:'나'},{raw:'첫 번째',at:'2026-09-01',actor:'나'}]})
});
vm.runInContext(source.slice(start,end),c);
const grouped=c.groupProjectPlans([{date:'2026-10-01',process:'조립',editable:true},{date:'2026-10-02',process:'조립',editable:true},{date:'2026-10-03',process:'전장',editable:false}]);
assert.equal(grouped.length,2);assert.equal(grouped[0].start,'2026-10-01');assert.equal(grouped[0].end,'2026-10-02');
await c.openProject('P-1');
assert.match(overview.innerHTML,/전체 조립일정/);assert.match(overview.innerHTML,/2026-10-01 ~ 2026-10-02/);assert.ok(overview.innerHTML.indexOf('첫 번째')<overview.innerHTML.indexOf('두 번째'));
inputButton.onclick();assert.equal(opened,'P-1');
console.log('PASS project opens complete grouped schedule and progress events in input order with direct progress input');

const form={isConnected:true,textContent:'',innerHTML:''};const formContext=vm.createContext({appIssue:{issueId:'previous'},open(){form.innerHTML='';},heading:()=>'',esc:String,$:()=>form,appCall:async()=>({status:'CANCELLED',issueId:'cancelled'}),appFailure(){throw Error('unexpected_error');}});
const formStart=source.indexOf('async function editIssue('),formEnd=source.indexOf('async function saveIssue(',formStart);vm.runInContext(source.slice(formStart,formEnd),formContext);await formContext.editIssue('cancelled');assert.equal(formContext.appIssue,null);assert.equal(form.innerHTML,'');assert.match(form.textContent,/수정할 수 없습니다/);console.log('PASS cancelled issue direct form entry remains blocked');

