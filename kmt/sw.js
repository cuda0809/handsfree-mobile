const CACHE='kmt-shell-2026-09-17-2';
const FILES=['./','./index.html','./mobile.js','./theme.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kmt-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==location.origin||!u.pathname.startsWith('/kmt/')||!FILES.some(f=>new URL(f,self.registration.scope).pathname===u.pathname))return;event.respondWith(caches.open(CACHE).then(async c=>(await c.match(event.request,{ignoreSearch:true}))||fetch(event.request)));});
