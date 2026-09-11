const CACHE='handsfree-real-v043b';
const SHELL=['/','/real.css','/real.js','/core-adapter.js','/project-detail.js','/readiness-ui.js','/ko-ui.js','/queue-client.js','/input-ui.js','/project-input-bridge.js','/manifest.webmanifest','/icon.svg','/app-version.json'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{self.skipWaiting();const c=await caches.open(CACHE);await c.addAll(SHELL).catch(()=>{});})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})())});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  if(req.url.includes('/api/')){event.respondWith(fetch(req,{cache:'no-store'}));return;}
  const isNav=req.mode==='navigate'||(req.headers.get('accept')||'').includes('text/html');
  if(isNav){event.respondWith((async()=>{try{const fresh=await fetch(req,{cache:'no-store'});const c=await caches.open(CACHE);c.put('/',fresh.clone());return fresh}catch(e){return (await caches.match('/'))||Response.error()}})());return;}
  event.respondWith((async()=>{try{const fresh=await fetch(req);const c=await caches.open(CACHE);c.put(req,fresh.clone());return fresh}catch(e){return (await caches.match(req))||Response.error()}})());
});
