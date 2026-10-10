/**
 * QUOI     — les notifications sur CE téléphone : où il en est, les activer, les couper.
 * POURQUOI — lot 8e : trois portes s'en servent (Réglages, cloche, tableau de bord). L'abonnement
 *            appartient au service worker (public/sw.js) ; la base garde son adresse d'envoi
 *            (RPC register_push_subscription), que send-push lit.
 * ATTENTION — « activé » se juge sur ce téléphone (un abonnement dans son service worker), jamais
 *            en base. La permission n'est demandée qu'au clic. Après un changement, les autres
 *            portes ouvertes se relisent (événement `flw-push`) : activer dans la cloche fait
 *            disparaître l'invitation du tableau de bord.
 */
import { useCallback, useEffect, useState } from 'react'
import { phonePush, vapidKeyBytes, type PhonePush } from './push-device'
import { must, supabase } from './supabase'

export type PhoneState = PhonePush | 'active' | 'loading'

const CHANGED = 'flw-push'
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function thisPhone(): PhonePush {
  const hasPush =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  return phonePush({
    userAgent: navigator.userAgent,
    hasPush,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    permission: 'Notification' in window ? Notification.permission : null,
  })
}

async function subscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

async function readState(): Promise<PhoneState> {
  const phone = thisPhone()
  if (phone !== 'possible') return phone
  return (await subscription()) ? 'active' : 'possible'
}

async function subscribe(): Promise<void> {
  if (!VAPID_KEY) throw new Error('Clé VAPID absente')
  if ((await Notification.requestPermission()) !== 'granted') return
  const registration = await navigator.serviceWorker.ready
  const current =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyBytes(VAPID_KEY),
    }))
  const { endpoint, keys } = current.toJSON()
  must(
    await supabase.rpc('register_push_subscription', {
      p_endpoint: endpoint ?? '',
      p_p256dh: keys?.p256dh ?? '',
      p_auth: keys?.auth ?? '',
    }),
  )
}

async function unsubscribe(): Promise<void> {
  const current = await subscription()
  if (!current) return
  must(await supabase.from('push_subscriptions').delete().eq('endpoint', current.endpoint))
  await current.unsubscribe()
}

export function usePhonePush() {
  const [state, setState] = useState<PhoneState>('loading')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function read() {
      const next = await readState()
      if (!cancelled) setState(next)
    }
    const reread = () => void read()
    reread()
    window.addEventListener(CHANGED, reread)
    return () => {
      cancelled = true
      window.removeEventListener(CHANGED, reread)
    }
  }, [])

  const change = useCallback(
    async (write: () => Promise<void>) => {
      if (busy) return
      setBusy(true)
      setFailed(false)
      try {
        await write()
      } catch {
        setFailed(true)
      }
      setBusy(false)
      window.dispatchEvent(new Event(CHANGED))
    },
    [busy],
  )

  const activate = useCallback(() => change(subscribe), [change])
  const cut = useCallback(() => change(unsubscribe), [change])

  return { state, busy, failed, activate, cut }
}
