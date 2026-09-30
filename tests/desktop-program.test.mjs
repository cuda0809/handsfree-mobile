import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../handsfree-desktop/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../handsfree-desktop/desktop.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../handsfree-desktop/desktop.css',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../handsfree-desktop/manifest.webmanifest',import.meta.url),'utf8'));

test('desktop program is installable and uses the current shared APIs',()=>{
  assert.match(html,/manifest\.webmanifest/);
  assert.equal(manifest.start_url,'/handsfree-desktop/');
  assert.match(js,/\/api\/sa2-real-status/);
  assert.match(js,/\/api\/sa2-app/);
  assert.match(js,/\/api\/sa2-lifecycle/);
  assert.match(js,/\/api\/sa2-write/);
});

test('desktop write flow confirms event, issue, and readback without retry loop',()=>{
  assert.match(js,/if\(!event\.applied\)/);
  assert.match(js,/action:'issue'/);
  assert.match(js,/action:'edit'/);
  assert.match(js,/readback\.state!==proposal\.state\|\|readback\.nextAction!==proposal\.nextAction/);
  assert.match(js,/자동 재전송하지 않았습니다/);
  assert.doesNotMatch(js,/setInterval\([^)]*saveProgress/);
});

test('phone layout is read-only while preserving shared live data',()=>{
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/\.edit-card,\[data-edit\]\{display:none!important\}/);
  assert.match(html,/휴대폰 조회 모드/);
  assert.match(js,/if\(!issue\|\|isPhone\(\)\)return/);
});

test('progress text derives the next action and closes completed work',()=>{
  assert.match(js,/출고완료\|납품완료/);
  assert.match(js,/완료 · 이력 보관/);
  assert.match(js,/갭세팅완료/);
  assert.match(js,/마감조립/);
  assert.match(js,/\?'CLOSED':issue\.status/);
});


test('late history responses cannot overwrite a newly selected screen',()=>{
  assert.match(js,/renderRun:0/);
  assert.match(js,/state\.view!==['"]history['"]\|\|run!==state\.renderRun/);
  assert.match(js,/const run=\+\+state\.renderRun/);
});
