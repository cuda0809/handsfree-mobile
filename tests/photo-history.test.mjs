import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const backend=fs.readFileSync('apps-script/HF_MEDIA.gs','utf8');
function fixture(){
 const tables=new Map(),files=new Map(),folders=[],operations=[];let sequence=0,gate='OPEN',interrupt=false;
 function sheet(name){const data=[];const sh={data,getLastRow:()=>data.length,getSheetId:()=>name,setFrozenRows(){},getRange(row,col,rows=1,cols=1){return {getDisplayValues:()=>Array.from({length:rows},(_,i)=>Array.from({length:cols},(_,j)=>String(data[row-1+i]?.[col-1+j]??''))),setValues(values){values.forEach((line,i)=>{data[row-1+i]??=[];line.forEach((v,j)=>data[row-1+i][col-1+j]=v);});return this;},setValue(v){data[row-1]??=[];data[row-1][col-1]=v;}};}};tables.set(name,sh);return sh;}
 const ss={getSheetByName:n=>tables.get(n),insertSheet:sheet};
 const c=vm.createContext({Date,console,PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'private-root'})},SpreadsheetApp:{flush(){}},safety_:()=>gate,hfLsHash_:v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex'),Utilities:{DigestAlgorithm:{SHA_256:'sha256'},base64Decode:v=>[...Buffer.from(v,'base64')],base64Encode:v=>Buffer.from(v).toString('base64'),computeDigest:(_,v)=>[...crypto.createHash('sha256').update(Buffer.from(v)).digest()],newBlob:v=>({getBytes:()=>[...Buffer.from(v)]})},hfLsCell_:(id,row,col,value)=>({id,row,col,value}),hfLsBatch_:(_,requests)=>{for(const r of requests){if(r.appendCells){const a=r.appendCells;tables.get(a.sheetId).data.push(a.rows[0].values.map(v=>v.userEnteredValue.stringValue));}else tables.get(r.id).data[r.row][r.col]=r.value;}}});
 vm.runInContext(backend,c);
 c.hfMediaFolder_=(parent,key,name)=>{folders.push({parent,key,name});return key;};
 c.hfMediaFile_=(folder,id,name,mime,bytes)=>{operations.push(id);if(files.has(id))assert.deepEqual(files.get(id),bytes);else files.set(id,bytes);if(interrupt){interrupt=false;throw Error('network_lost');}};
 c.hfMediaDrive_=(path)=>path.includes('generateIds')?{ids:['file-'+(++sequence),'file-'+(++sequence)]}:{getBlob:()=>({getBytes:()=>files.get(path.match(/files\/([^?]+)/)[1])})};
 const bytes=[255,216,1,2,255,217],b={requestId:'request-1234567890',issueId:'PHI-1234567890123456',issueTitle:'리크 점검',memo:'사용자 실제 기록',takenAt:'2026-10-16',mime:'image/jpeg',hash:crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex'),actor:{sub:'user|담당자'}},body={data:Buffer.from(bytes).toString('base64')},target={id:'P1',job:'260728A-064',customer:'엔켓'};
 return {c,ss,tables,files,folders,operations,b,body,target,setGate:v=>gate=v,interrupt:()=>interrupt=true};
}
test('photo metadata is indexed separately; repeated saved request never duplicates files or work records',()=>{
 const f=fixture(),{c,ss,b,body,target}=f;assert.equal(c.hfMediaSave_(ss,b,body,target).status,'STORED');assert.equal(c.hfMediaSave_(ss,b,body,target).status,'STORED');
 assert.equal(f.operations.length,2);assert.equal(f.tables.size,2);assert.equal(f.tables.get('HF_MEDIA_사진이력').data.length,2);assert.equal(f.tables.get('HF_MEDIA_저장대기').data[1][6],'STORED');assert.equal(f.folders[0].key,'project-P1');assert.equal(f.folders[1].key,b.issueId);
 assert.throws(()=>c.hfMediaSave_(ss,{...b,memo:'changed'},body,target),/request_conflict/);
 assert.throws(()=>c.hfMediaSave_(ss,b,body,{...target,id:'OTHER'}),/request_conflict/);
});
test('interrupted photo write requires explicit recovery and reuses reserved file IDs',()=>{
 const f=fixture();f.interrupt();assert.throws(()=>f.c.hfMediaSave_(f.ss,f.b,f.body,f.target),/network_lost/);assert.equal(f.files.size,1);
 assert.throws(()=>f.c.hfMediaSave_(f.ss,f.b,f.body,f.target),/media_pending/);assert.equal(f.operations.length,1);
 assert.equal(f.c.hfMediaSave_(f.ss,{...f.b,resume:true},f.body,f.target).status,'STORED');assert.equal(f.files.size,2);assert.equal(f.tables.get('HF_MEDIA_사진이력').data.length,2);
});
test('closed safety gate records classification but writes no photos or equipment history',()=>{
 const f=fixture();f.setGate('CLOSED');assert.throws(()=>f.c.hfMediaSave_(f.ss,f.b,f.body,f.target),/safe_write_not_ready/);assert.equal(f.files.size,0);assert.equal(f.tables.get('HF_MEDIA_저장대기').data[1][5],'PHOTO_NOTE');assert.equal(f.tables.has('HF_MEDIA_사진이력'),false);
});
test('tampered image hash and missing metadata fail before queue creation',()=>{
 for(const patch of [{hash:'a'.repeat(64)},{memo:''},{issueId:'wrong'}]){const f=fixture();assert.throws(()=>f.c.hfMediaSave_(f.ss,{...f.b,...patch},f.body,f.target),/invalid_photo|invalid_metadata/);assert.equal(f.tables.size,0);}
});
test('today issue photo entry points remain separate from text issues and use actual plan processes',()=>{
 const flow=fs.readFileSync('kmt-sa2/app-flow.js','utf8'),today=flow.slice(flow.indexOf('function todayIssues(){'),flow.indexOf('function generalIssueForm(){'));
 assert.doesNotMatch(today,/today-issue-summary/);assert.match(today,/issuePlanProgress\(x\)/);assert.match(today,/openEquipmentPhotos/);
 const c=vm.createContext({esc:v=>String(v),HfIssueContext:{stage:v=>v==='전장'?2:v==='조립'?1:-1},planReadStale:false});vm.runInContext(fs.readFileSync('kmt-sa2/issue-workspace.js','utf8').split('const issueDecisionDrafts=')[0],c);
 const html=c.issuePlanProgress({state:'전장',planTimeline:[{process:'조립',date:'2026-10-01'},{process:'전장',date:'2026-10-02'}]});assert.match(html,/조립/);assert.match(html,/전장/);assert.doesNotMatch(html,/프로그램|출고|완료/);
});
