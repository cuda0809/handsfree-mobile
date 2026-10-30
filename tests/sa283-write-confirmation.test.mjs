import fs from 'node:fs';
import assert from 'node:assert/strict';

const mobile=fs.readFileSync(new URL('../kmt-sa2/mobile.js',import.meta.url),'utf8');
const flow=fs.readFileSync(new URL('../kmt-sa2/app-flow.js',import.meta.url),'utf8');

assert.match(mobile,/if\(d\.applied\)\{toast\('업무이력 저장 완료/);
assert.match(mobile,/await verifyEventNote\(id,d\);receiptDetail\(id\)/);
assert.match(flow,/const directWriteAck=!!receipt&&d\.applied===true&&d\.status==='WRITTEN'/);
assert.match(flow,/업무이력 저장 완료\. 현재 업무 카드 반영을 확인 중입니다\./);
assert.match(flow,/if\(r\.issueId\)return await syncProgressIssue\(id\)/);
console.log('PASS known-safe-write success skips redundant receipt/history polling');
