const CACHE='handsfree-shell-v1';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const isNav=req.mode==='navigate'||(req.headers.get('accept')||'').includes('text/html');
  if(isNav){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        const cache=await caches.open(CACHE);
        cache.put('/',fresh.clone());
        return fresh;
      }catch(e){
        return (await caches.match('/'))||Response.error();
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    try{return await fetch(req,{cache:'no-store'});}catch(e){return (await caches.match(req))||Response.error();}
  })());
});