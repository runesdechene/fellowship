/**
 * QUOI     — les gestes du navigateur pour les notifications sur CE téléphone : où il en est,
 *            s'abonner, se désabonner.
 * POURQUOI — lot 8e. L'abonnement appartient au service worker (public/sw.js) ; la base garde son
 *            adresse d'envoi (RPC register_push_subscription), que send-push lit. usePhonePush
 *            s'en sert, et la déconnexion désabonne (lib/auth.tsx).
 * ATTENTION — relecture du 10/10/2026 :
 *            • chaque lecture réinscrit l'abonnement existant au nom de la personne connectée
 *              (une écriture sans effet si rien n'a changé) : un téléphone passé d'une personne à
 *              l'autre, ou dont la ligne a été effacée, se répare tout seul ;
 *            • on lit l'inscription par getRegistration, jamais par `ready`, qui attend pour
 *              toujours si le service worker n'a pas pu s'installer.
 */
import { phonePush, vapidKeyBytes, type PhonePush } from './push-device'
import { must, supabase } from './supabase'

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function thisPhone(): PhonePush {
  const hasPush =
    Boolean(VAPID_KEY) &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  return phonePush({
    userAgent: navigator.userAgent,
    hasPush,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    permission: 'Notification' in window ? Notification.permission : null,
  })
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined
  return navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
}

async function remember(current: PushSubscription): Promise<void> {
  const { endpoint, keys } = current.toJSON()
  must(
    await supabase.rpc('register_push_subscription', {
      p_endpoint: endpoint ?? '',
      p_p256dh: keys?.p256dh ?? '',
      p_auth: keys?.auth ?? '',
    }),
  )
}

export async function readPhone(): Promise<PhonePush | 'active'> {
  const phone = thisPhone()
  if (phone !== 'possible') return phone
  const current = await (await registration())?.pushManager.getSubscription()
  if (!current) return 'possible'
  await remember(current).catch(() => undefined)
  return 'active'
}

export async function subscribe(): Promise<void> {
  if (!VAPID_KEY) throw new Error('Clé VAPID absente')
  if ((await Notification.requestPermission()) !== 'granted') return
  const worker = await registration()
  if (!worker) throw new Error('Service worker absent')
  const current =
    (await worker.pushManager.getSubscription()) ??
    (await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyBytes(VAPID_KEY),
    }))
  await remember(current)
}

/** Couper, et se déconnecter : ce téléphone ne reçoit plus rien de personne. */
export async function unsubscribe(): Promise<void> {
  const current = await (await registration())?.pushManager.getSubscription()
  if (!current) return
  must(await supabase.from('push_subscriptions').delete().eq('endpoint', current.endpoint))
  await current.unsubscribe()
}
