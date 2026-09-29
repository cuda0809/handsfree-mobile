import assert from 'node:assert/strict';
import {simpleCookie,simplePerson,validateRegistrationKey} from '../lib/simple-auth.mjs';

const key='test-secret';
assert.equal(validateRegistrationKey(key,key),true);
assert.equal(validateRegistrationKey('wrong',key),false);
const cookie=simpleCookie({sub:'simple-test',email:'owner@test'},key);
const req={headers:{cookie:cookie.split(';')[0]}};
const p=simplePerson(req,key);
assert.equal(p.email,'owner@test');
assert.equal(p.sub,'simple-test');
assert.equal(p.auth,'simple');
console.log('PASS simple auth signed device cookie and one-time registration key');
