const CACHE='handsfree-shell-v4';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  await Promise.all(clients.map(async client=>{
    try{if('navigate' in client) await client.navigate('/');}catch(e){}
  }));
})());});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const isNav=req.mode==='navigate'||(req.headers.get('accept')||'').includes('text/html');
  if(isNav){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        const html=await fresh.text();
        let injected=html;
        if(!injected.includes('/equipment-tab.js')) injected=injected.replace('</body>','<script src="/equipment-tab.js?v=4"></script></body>');
        if(!injected.includes('/update-client.js')) injected=injected.replace('</body>','<script src="/update-client.js?v=4"></script></body>');
        const headers=new Headers(fresh.headers);
        headers.set('content-type','text/html; charset=utf-8');
        headers.set('cache-control','no-store');
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