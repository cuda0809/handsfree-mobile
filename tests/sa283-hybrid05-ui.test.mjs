import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync(new URL('../kmt-sa2/index.html',import.meta.url),'utf8');
const mobile=fs.readFileSync(new URL('../kmt-sa2/mobile.js',import.meta.url),'utf8');
const flow=fs.readFileSync(new URL('../kmt-sa2/app-flow.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../kmt-sa2/sw.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../kmt-sa2/hybrid05.css',import.meta.url),'utf8');

assert.match(index,/hybrid05\.css/);
assert.match(index,/HYBRID 0\.5/);
assert.match(mobile,/오늘 확인할 일/);
assert.match(mobile,/onclick="delivery\(\)"/);
assert.match(mobile,/onclick="projects\(\)"/);
assert.match(mobile,/내 기록/);
assert.match(flow,/async function delivery\(/);
assert.match(flow,/async function projects\(/);
assert.match(flow,/planRows=Array\.isArray\(plans\.records\)/);
assert.match(flow,/hybrid-project-card/);
assert.match(flow,/진행 내용만 간단히 남기면 현재 상태와 이력에 연결됩니다/);
assert.match(sw,/kmt-sa2-preview-sa283-hybrid05/);
assert.match(sw,/hybrid05\.css/);
assert.match(css,/Hybrid Study 0\.5 visual layer/);
assert.match(mobile,/api\('\/api\/sa2-real-status'/);
assert.match(mobile,/api\('\/api\/sa2-write'/);
console.log('PASS Hybrid 0.5 UI is layered over the existing SA2.8.3 Core read/write engine');
