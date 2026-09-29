import {person} from './person-auth.mjs';
import {simplePerson} from './simple-auth.mjs';
import {roleFor} from './access.mjs';
export function authUser(req){
 const p=simplePerson(req)||person(req);
 if(!p)return null;
 try{return {...p,role:roleFor(p.email)};}catch{return null;}
}
