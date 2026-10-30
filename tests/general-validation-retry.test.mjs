import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('apps-script/HF_REAL_SAFE_WRITE_V08.gs','utf8');
test('general retry reuses only exact incomplete normalized row and honors production dropdown',()=>{
 const raw='다이아덴트 KRM - 80B 장비 점검 (롤러 밀림현상 재발생) (장현준)';
 const partial=Array(23).fill('');partial[0]='REQ-E01';partial[3]=raw;
 const table=[Array(23).fill(''),partial];let writes=0;
 const sh={getLastRow:()=>table.length,getMaxColumns:()=>23,getRange:(row,col,n=1,m=1)=>({
  getDisplayValues:()=>table.slice(row-1,row-1+n).map(r=>r.slice(col-1,col-1+m)),
  setValues:values=>{if(col===1){assert.ok(['기타','타팀지원'].includes(values[0][7]),'production validation');writes++;}values.forEach((r,i)=>r.forEach((v,j)=>table[row-1+i][col-1+j]=v));},setNumberFormat(){}})};
 const c=vm.createContext({HF_SW:{TZ:'Asia/Seoul',SHEET:{NORM:'norm'},ID:{NORM:1}},getSheet_:()=>sh,blankRow_:()=>3,ensureRows_(){},sha256_:()=> 'hash',norm_:x=>x,dt_:()=> 'now',Utilities:{formatDate:()=> '2026-10-07'}});
 vm.runInContext(src.slice(src.indexOf('function appendNorm_('),src.indexOf('function setNormStatus_(')),c);
 const e={general:true,eventIndex:1,raw,type:'기타',source:'FIELD_INPUT',date:new Date(),receivedAt:new Date(),safe:true,confidence:1,actor:'fixture@example.test'};
 assert.equal(c.appendNorm_({},e,'REQ'),2);assert.equal(writes,1);assert.equal(table.length,2);assert.equal(table[1][17],'NORMALIZED');assert.equal(table[1][20],'');
 assert.throws(()=>c.appendNorm_({},e,'REQ'),/GENERAL_EVENT_RETRY_REVIEW_REQUIRED/);
 table[1]=partial.slice();table[1][3]='different';assert.throws(()=>c.appendNorm_({},e,'REQ'),/GENERAL_EVENT_RETRY_REVIEW_REQUIRED/);
});
