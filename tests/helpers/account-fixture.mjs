import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
export function fixture(){
 const props={HF_MEMBER_AUTH_OPEN:'OPEN',HF_MEMBER_AUTH_PHASE:'OWNER_ONLY',HF_REAL_READ_TOKEN:'fixture-secret',HF_MEMBER_REGISTRY_V1:JSON.stringify({schema:1,rows:[['HFU-007','이상준','B','team_lead','ACTIVE','1','','','','','0','0','','MASTER'],['HFU-008','이성호','B','member','BLOCKED','1','','','','','0','0','','']]})};
 const store={getProperty:k=>props[k]||null,setProperty:(k,v)=>props[k]=v,deleteProperty:k=>delete props[k]};
 const ss={};const c=vm.createContext({PropertiesService:{getScriptProperties:()=>store},SpreadsheetApp:{openById:()=>ss,flush(){}},HF_SPREADSHEET_ID:'fixture',HF_TOKEN_KEY:'HF_REAL_READ_TOKEN',LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{newBlob:s=>({getBytes:()=>Buffer.from(s)}),Charset:{UTF_8:'utf8'},computeHmacSha256Signature:(s,t)=>crypto.createHmac('sha256',t).update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url')}});
 for(const path of ['apps-script/HF_MEMBER_AUTH.gs','apps-script/HF_ACCOUNT_AUTH.gs'])vm.runInContext(fs.readFileSync(path,'utf8'),c);
 async function call(body){const signed=JSON.stringify({...body,at:Date.now(),nonce:crypto.randomUUID()}),signature=crypto.createHmac('sha256',props.HF_REAL_READ_TOKEN).update(signed).digest('base64url');return c.hfLightAuthDispatch_({signed,signature});}
 return {props,c,call};
}
