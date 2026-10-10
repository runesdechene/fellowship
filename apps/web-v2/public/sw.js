/**
 * QUOI     — le service worker de la V2 : afficher une notification reçue sur le téléphone, et
 *            ouvrir le bon écran quand on la touche.
 * POURQUOI — lot 8e. Sa portée est /v2/ : plus précise que celle de la V1 (/), elle l'emporte sur
 *            les pages de la V2, et la V1 n'est pas touchée. Pas de cache : la V2 reste servie par
 *            le réseau.
 * ATTENTION — le message vient de la fonction send-push : { title, body, url, tag }, où url est un
 *            chemin de la V2 (« /evenement/… ») qu'on pose sous la portée. À la bascule, il prendra
 *            la portée / (spec du lot 8e, §1).
 */
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function inScope(path) {
  return new URL(String(path || '/').replace(/^\//, ''), self.registration.scope).href
}

self.addEventListener('push', (event) => {
  let message = {}
  try {
    message = event.data ? event.data.json() : {}
  } catch {
    message = { body: event.data ? event.data.text() : '' }
  }
  const url = inScope(message.url)
  event.waitUntil(
    self.registration.showNotification(message.title || 'Fellowship', {
      body: message.body || '',
      icon: inScope('/icon-192.png'),
      badge: inScope('/icon-192.png'),
      tag: message.tag || url,
      data: { url },
    }),
  )
})

// L'appli déjà ouverte vient devant et va à l'écran ; sinon elle s'ouvre.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((client) => client.url.startsWith(self.registration.scope))
      if (open) {
        await open.focus()
        await open.navigate(url)
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
