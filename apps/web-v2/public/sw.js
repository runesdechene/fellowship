/**
 * QUOI     — le service worker de Fellowship : afficher une notification reçue sur le téléphone,
 *            ouvrir le bon écran quand on la touche, et, une fois, prendre la suite de la V1.
 * POURQUOI — lot 8e, puis la bascule (lot 12) : sa portée est `/`, et il est publié à la même
 *            adresse que celui de la V1 (`/sw.js`). Le navigateur le prend donc comme une mise à
 *            jour : à l'activation, il efface les caches que la V1 servait (`workbox-*`) et, s'il
 *            en a trouvé, recharge les fenêtres ouvertes, qui arrivent sur la V2. Pas de cache :
 *            la V2 reste servie par le réseau.
 * ATTENTION — le message vient de la fonction send-push : { title, body, url, tag }, où url est un
 *            chemin de l'app (« /evenement/… ») qu'on pose sous la portée. Ne jamais renommer ni
 *            déplacer ce fichier : un téléphone qui a encore la V1 ne serait plus mis à jour.
 */
self.addEventListener('install', () => {
  self.skipWaiting()
})

// La V1 servait sa page depuis ces caches : tant qu'ils restent, une fenêtre ouverte garde la V1.
async function leaveV1() {
  const keys = (await caches.keys()).filter((key) => key.startsWith('workbox-'))
  await Promise.all(keys.map((key) => caches.delete(key)))
  return keys.length > 0
}

// Le rechargement part APRÈS l'activation, hors de waitUntil : une navigation attend que le
// service worker soit actif, et l'activation qui attendrait cette navigation ne finirait jamais
// (la page restait figée, vérifié en Edge sans tête le 19/10/2026).
self.addEventListener('activate', (event) => {
  const cleaned = leaveV1().then(async (hadV1) => {
    await self.clients.claim()
    return hadV1
  })
  event.waitUntil(cleaned)
  void cleaned.then(async (hadV1) => {
    if (!hadV1) return
    const windows = await self.clients.matchAll({ type: 'window' })
    windows.forEach((client) => {
      client.navigate(client.url).catch(() => undefined)
    })
  })
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
      // navigate() échoue sur une fenêtre que ce service worker ne contrôle pas encore (après un
      // rechargement forcé) : on ouvre alors une fenêtre neuve (relecture du 10/10/2026).
      if (open) {
        try {
          await open.focus()
          await open.navigate(url)
          return
        } catch {
          /* on ouvre une fenêtre neuve */
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
