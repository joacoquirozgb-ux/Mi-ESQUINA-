/* Mi Esquina: permite abrir la app sin conexión. Siempre intenta traer la versión nueva primero. */
const CACHE='mi-esquina-v2';
const SHELL=['./','index.html','app.html','app.js','app.css','fonts.css','vendor/supabase.js','manifest.webmanifest','icons/icon-192.png',
  'fonts/anton-latin-400-normal.woff2','fonts/figtree-latin-400-normal.woff2','fonts/figtree-latin-600-normal.woff2','fonts/figtree-latin-700-normal.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==self.location.origin)return; // nunca guarda datos de la cuenta
  e.respondWith(fetch(r).then(res=>{
    if(res.ok&&res.type==='basic'){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy))}
    return res;
  }).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('app.html'):Response.error()))));
});
