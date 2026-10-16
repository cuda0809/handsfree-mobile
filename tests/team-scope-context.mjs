import vm from 'node:vm';
import fs from 'node:fs';
const mobile=fs.readFileSync('kmt-sa2/mobile.js','utf8');
const scope=mobile.slice(mobile.indexOf('let selectedTeam='),mobile.indexOf('function itemById('));
export function scopeContext(values){
 if(!values.readStore)values.readStore=(k,f)=>f;
 const c=vm.createContext(values);
 vm.runInContext(scope,c);return c;
}
