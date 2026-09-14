/* Trial closed — unregister and clear every cached copy of the old app so a
   device that still has it installed cannot keep serving it from cache. */
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => caches.delete(n)));
    await self.clients.claim();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(c => c.navigate(c.url));
    await self.registration.unregister();
  })());
});
self.addEventListener('fetch', e => { /* pass through — nothing is cached */ });
