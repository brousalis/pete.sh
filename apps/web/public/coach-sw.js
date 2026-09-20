/**
 * PeteCoach service worker.
 *
 * Scoped to push notifications only. It deliberately does not cache anything:
 * this section shows readiness, symptoms and plan changes, and a stale cached
 * briefing telling the athlete to run on a day the guardrails blocked would be
 * actively harmful.
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'PeteCoach', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'PeteCoach', {
      body: payload.body || '',
      // Tag collapses repeats: a second briefing replaces the first rather
      // than stacking.
      tag: payload.tag || 'coach',
      renotify: payload.tag === 'red-flag',
      requireInteraction: payload.tag === 'red-flag',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/coach' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = event.notification.data?.url || '/coach'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab rather than opening another one.
      for (const client of clients) {
        if (client.url.includes('/coach') && 'focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
