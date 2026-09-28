// Deployment configuration must mirror the existing approved account list.
// No default accounts, automatic registration, or client-selected roles.
export function roleFor(email){
 let users;try{users=JSON.parse(process.env.HF_REAL_ALLOWED_USERS||'{}');}catch{throw Error('identity_not_configured');}
 if(!users||Array.isArray(users)||typeof users!=='object')throw Error('identity_not_configured');
 const role=Object.hasOwn(users,email)?users[email]:null;
 if(!['owner','writer','reader'].includes(role))throw Error('identity_denied');
 return role;
}
