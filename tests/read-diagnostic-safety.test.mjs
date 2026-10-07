import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('failed read identifies action without retaining request or private error text',async()=>{
 const source=fs.readFileSync('kmt-sa2/mobile.js','utf8');
 const error=Object.assign(Error('app_unavailable'),{status:502,data:{reason:'upstream_timeout'}});
 const context=vm.createContext({api:async()=>{throw error;},navigator:{onLine:true},setTimeout:f=>f(),Error});
 vm.runInContext(source.slice(source.indexOf('async function readApp('),source.indexOf('function coreProcessFromState(')),context);
 await assert.rejects(context.readApp({action:'catalog',orderId:'PRIVATE_JOB'}),e=>e.readAction==='catalog'&&e.data.reason==='upstream_timeout');
 assert.equal(error.orderId,undefined);
});
test('server diagnostic whitelist never prints exception message or credentials',()=>{
 const source=fs.readFileSync('api/sa2-app.js','utf8');
 const statement=source.match(/const transport=.*;/)[0]+'\n'+source.match(/const diagnostic=.*;/)[0];
 const run=e=>vm.runInNewContext(statement+'diagnostic;',{e});
 assert.equal(run(Object.assign(Error('private URL token=SECRET'),{name:'TypeError'})),'upstream_unavailable');
 assert.equal(run(Object.assign(Error('private URL'),{name:'TimeoutError'})),'upstream_timeout');
 assert.equal(run(Error('invalid_source_month')),'invalid_source_month');
 assert.equal(run(Object.assign(Error('fetch failed'),{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}})),'UND_ERR_CONNECT_TIMEOUT');
 assert.equal(run(Object.assign(Error('fetch failed'),{cause:{code:'PRIVATE_SECRET'}})),'upstream_unavailable');
 assert.match(source,/console.warn\('HF_APP_READ_FAILED',b.action,diagnostic\)/);
 assert.doesNotMatch(source,/console\.(?:warn|error|log)\([^\n]*(?:signed|signature|payload|e.message)/);
});
