const CACHE='handsfree-shell-v2';
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
        const html=await fresh.text();
        const injected=html.includes('/equipment-tab.js')?html:html.replace('</body>','<script src="/equipment-tab.js"></script></body>');
        const headers=new Headers(fresh.headers);
        headers.set('content-type','text/html; charset=utf-8');
        const response=new Response(injected,{status:fresh.status,statusText:fresh.statusText,headers});
        const cache=await caches.open(CACHE);
        cache.put('/',response.clone());
        return response;
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