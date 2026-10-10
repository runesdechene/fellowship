/**
 * QUOI     — ce que permet ce téléphone pour les notifications, le « Plus tard » de l'invitation,
 *            et la clé publique VAPID en octets.
 * POURQUOI — lot 8e : les trois portes (Réglages, cloche, tableau de bord) ne montrent « Activer »
 *            que là où il peut aboutir. Règles pures, testées sans navigateur.
 * ATTENTION — sur iPhone, le push n'existe que dans l'appli ajoutée à l'écran d'accueil. Un refus
 *            donné au navigateur est définitif : il se rouvre dans les réglages du téléphone.
 */

export type PhonePush = 'possible' | 'installer-d-abord' | 'refuse' | 'impossible'

export function phonePush(phone: {
  userAgent: string
  hasPush: boolean
  standalone: boolean
  permission: NotificationPermission | null
}): PhonePush {
  if (/iPad|iPhone|iPod/.test(phone.userAgent) && !phone.standalone) return 'installer-d-abord'
  if (!phone.hasPush) return 'impossible'
  if (phone.permission === 'denied') return 'refuse'
  return 'possible'
}

const INVITE_PAUSE_DAYS = 30

/** « Plus tard » cache l'invitation du tableau de bord 30 jours. */
export function inviteHidden(dismissedAt: string | null, now: Date): boolean {
  if (!dismissedAt) return false
  const since = now.getTime() - new Date(dismissedAt).getTime()
  return since < INVITE_PAUSE_DAYS * 24 * 60 * 60 * 1000
}

/** La clé est en base64 « url » (- et _ au lieu de + et /, sans =). */
export function vapidKeyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}
