/* Mi Esquina: permite abrir la app sin conexión y muestra los avisos del instructor. Siempre intenta traer la versión nueva primero. */
const CACHE='mi-esquina-v7';
const SHELL=['./','index.html','app.html','app.js','app.css','fonts.css','vendor/supabase.js','manifest.webmanifest','icons/icon-192.png','icons/badge-96.png',
  'fonts/anton-latin-400-normal.woff2','fonts/figtree-latin-400-normal.woff2','fonts/figtree-latin-600-normal.woff2','fonts/figtree-latin-700-normal.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==self.location.origin)return; // nunca guarda datos de la cuenta
  e.respondWith(fetch(r).then(res=>{
    if(res.ok&&res.type==='basic'&&!u.search){ // sin ?parámetros: la vuelta de Mercado Pago no se guarda
      const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy))}
    return res;
  }).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('app.html'):Response.error()))));
});
/* Avisos del instructor: llegan cifrados desde el servidor aunque la app esté cerrada */
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(err){d={b:e.data?e.data.text():''}}
  const url=/^app\.html(#[\w-]*)?$/.test(d.url||'')?d.url:'app.html#coach';
  e.waitUntil(self.registration.showNotification(String(d.t||'Mi Esquina').slice(0,80),{
    body:String(d.b||'').slice(0,240),tag:String(d.tag||'coach').slice(0,60),renotify:true,
    icon:'icons/icon-192.png',badge:'icons/badge-96.png',vibrate:[260,120,260],data:{url}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=new URL((e.notification.data&&e.notification.data.url)||'app.html#coach',self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    for(const c of cs)if(c.url.startsWith(self.registration.scope)&&'focus' in c){c.postMessage({coach:1});return c.focus()}
    return self.clients.openWindow(url);
  }));
});
