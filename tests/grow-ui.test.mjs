import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../kmt-sa2/mobile.js',import.meta.url),'utf8');
const start=source.indexOf('async function growAnswer('),end=source.indexOf('\nfunction settings(',start);
let html='',opened='';
const resultButton={dataset:{growProject:'P-1'}};
const result={textContent:'',innerHTML:'',querySelectorAll:()=>[resultButton]};
const question={value:'미코 상태와 다음 행동 알려줘'};
const c=vm.createContext({
 $:id=>id==='growQuestion'?question:result,
 live:true,
 sourceDate:'2026-09-29',
 items:[{orderId:'P-1',state:'조립중',nextAction:'검수'}],
 getAppProjects:async()=>[{orderId:'P-1',customer:'미코',model:'KDM-150',state:'조립중',pm:'홍길동'}],
 norm:s=>String(s||'').toLowerCase().replace(/[\s-]/g,''),
 esc:String,
 appError:()=> 'error',
 openProject:id=>opened=id,
 Date
});
vm.runInContext(source.slice(start,end),c);
await c.growAnswer();html=result.innerHTML;assert.match(html,/운영DB 재조회/);assert.match(html,/Project ID P-1/);assert.match(html,/다음 행동 검수/);resultButton.onclick();assert.equal(opened,'P-1');
question.value='미코 상태 수정해';await c.growAnswer();assert.match(result.textContent,/상태 수정 또는 현장 입력/);
console.log('PASS Grow queries live catalog/current-state evidence and routes writes to audited screens');
