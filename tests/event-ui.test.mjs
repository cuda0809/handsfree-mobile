import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../kmt/mobile.js',import.meta.url),'utf8');
let row={id:'one',status:'draft',target:'260710A-052 · 미코',text:'검수 완료'},outbound;
const c=vm.createContext({notes:()=>[row],canSendNote:()=>true,navigator:{onLine:true},verifyEventNote:async()=>{},updateNote:(id,p)=>Object.assign(row,p),receiptDetail(){},refresh:async()=>{},api:async(path,b)=>{outbound=b;return {ok:true,status:'REVIEW',applied:true,requestId:'HF-mixed',ack:'반영 1 · 검토 1'};},toast(){},location:{}});
vm.runInContext(src.slice(src.indexOf('async function sendNote('),src.indexOf('\nasync function refreshAndShow')),c);
await c.sendNote('one');assert.equal(row.status,'partial');assert.equal(row.requestId,'HF-mixed');assert.match(outbound.text,/260710A-052/);assert.equal(row.ack,'반영 1 · 검토 1');
vm.runInContext(src.match(/function login\(\)\{[^\n]+/)[0],c);c.login();assert.equal(c.location.href,'./login.html');
assert.match(src,/target=x\?`\$\{x.orderId/);
console.log('PASS Event mobile explicit project, partial review status, receipt persistence, personal login navigation');
