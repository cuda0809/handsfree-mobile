import {sa2Person} from './sa2-auth.mjs';
import {roleFor} from './access.mjs';
export function authUser(req){const p=sa2Person(req);if(!p)return null;try{return {...p,role:roleFor(p.email)};}catch{return null;}}
