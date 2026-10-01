const CACHE='handsfree-pc-2026-10-01-startup-1';
const ASSETS=['./','./index.html','./desktop.css','./desktop.js','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('handsfree-pc-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).pathname.startsWith('/api/'))return;const update=fetch(event.request,{cache:'no-store'}).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;});event.waitUntil(update.catch(()=>{}));event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||update.catch(()=>Response.error())));});

