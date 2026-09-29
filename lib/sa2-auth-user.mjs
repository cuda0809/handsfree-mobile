import {sa2Person} from './sa2-auth.mjs';
export function authUser(req){
  const p=sa2Person(req);
  return p?{...p,role:'writer'}:null;
}
