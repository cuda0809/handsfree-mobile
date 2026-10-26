import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
async function render(user){const button={textContent:'로그인',setAttribute(k,v){this[k]=v;}},location={};const c=vm.createContext({document:{querySelector:s=>s==='.login-button'?button:null},AbortSignal,location,fetch:async()=>({ok:true,json:async()=>({ok:true,user})})});vm.runInContext(fs.readFileSync('kmt-sa2/member-session.js','utf8'),c);await new Promise(r=>setImmediate(r));return {button,location};}
test('existing connected employees see connection state instead of another login invitation',async()=>{const f=await render({label:'팀원',auth:'legacy'});assert.equal(f.button.textContent,'내 계정');f.button.onclick();assert.equal(f.location.href,'./account.html?v=20261027m264c&manage=1');});
test('legacy owner only gets first setup, while server-verified master gets protected management',async()=>{const old=await render({label:'이상준',auth:'legacy'});assert.equal(old.button.textContent,'내 계정');const owner=await render({label:'이상준',auth:'member',team:'B',role:'team_lead',isMaster:true});assert.equal(owner.button.textContent,'마스터');owner.button.onclick();assert.equal(owner.location.href,'./members.html');assert.match(owner.button['aria-label'],/B팀장/);});
