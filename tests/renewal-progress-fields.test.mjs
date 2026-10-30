import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../handsfree-renewal/mobile.js',import.meta.url),'utf8');
const start=source.indexOf('function progressFields('),end=source.indexOf('function showProgressFields(',start);
const context=vm.createContext({});
vm.runInContext(source.slice(start,end),context);

assert.deepEqual({...context.progressFields('조립 완료\n전장 배선 시작','기존 행동')},{state:'조립 완료',nextAction:'전장 배선 시작'});
assert.deepEqual({...context.progressFields('갭세팅 완료 → 마감조립','기존 행동')},{state:'갭세팅 완료',nextAction:'마감조립'});
assert.deepEqual({...context.progressFields('출고 준비, 다음 행동: 포장 확인','기존 행동')},{state:'출고 준비',nextAction:'포장 확인'});
assert.deepEqual({...context.progressFields('테스트 진행','결과 확인')},{state:'테스트 진행',nextAction:'결과 확인'});
console.log('PASS one progress entry deterministically maps current state and next action');
