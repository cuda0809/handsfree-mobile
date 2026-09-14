const CACHE='handsfree-real-shell-v8';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  event.respondWith((async()=>{
    try{return await fetch(req,{cache:'no-store'});}catch(e){return Response.error();}
  })());
});
