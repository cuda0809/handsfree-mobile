import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

// Use synthetic credentials only; never discover or exercise the operating PIN.
const source=fs.readFileSync(new URL('../api/sa2-auth.js',import.meta.url),'utf8');
function verifier(env){
  const salt=crypto.randomBytes(16);
  const hash=crypto.scryptSync('8192',salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  const code=source.split('function clientKey')[0]
    .replace("import crypto from 'node:crypto';",'')
    .replace(/const PIN_SALT=.*?;/,`const PIN_SALT='${salt.toString('base64url')}';`)
    .replace(/const PIN_HASH=.*?;/,`const PIN_HASH='${hash.toString('base64url')}';`);
  const context=vm.createContext({crypto,Buffer,process:{env}});
  vm.runInContext(code,context);
  return context.validPin;
}
test('server setting replaces old PIN including leading zeros',()=>{
  const check=verifier({HF_SA2_LOGIN_PIN:'0385'});
  assert.equal(check('0385'),true);
  assert.equal(check('8192'),false);
  for(const value of ['385','03850',' 0385','0385 ','abcd',''])assert.equal(check(value),false);
});
test('missing setting preserves existing authentication until explicit rotation',()=>{
  const check=verifier({});
  assert.equal(check('8192'),true);
  assert.equal(check('0385'),false);
});
test('malformed server setting cannot reactivate legacy PIN',()=>{
  for(const value of ['', 'bad', '123', '12345',' 1234']){
    const check=verifier({HF_SA2_LOGIN_PIN:value});
    assert.equal(check('8192'),false);
    assert.equal(check('0385'),false);
  }
});
