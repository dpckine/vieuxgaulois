/* Vieux Gaulois Handball: service worker. Recibe las notificaciones aunque la app esté cerrada. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Necesario para que la app se pueda instalar; no guarda nada en caché (los datos vienen de Firebase).
self.addEventListener('fetch', () => {});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { cuerpo: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Vieux Gaulois', {
    body: d.cuerpo || '',
    icon: 'icono-192.png',
    badge: 'icono-192.png',
    data: { tab: d.tab || '' },
    tag: d.tab || undefined,
    renotify: !!d.tab,
  }));
});

// Al tocar la notificación se abre la app (o se enfoca la que ya está abierta) en su sección.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL('./' + (e.notification.data.tab ? '#' + e.notification.data.tab : ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
    const abierta = lista.find((c) => c.url.startsWith(self.registration.scope));
    if (abierta) return abierta.navigate(url).then((c) => (c || abierta).focus());
    return self.clients.openWindow(url);
  }));
});
