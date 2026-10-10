/**
 * QUOI     — les notifications sur CE téléphone : où il en est, les activer, les couper.
 * POURQUOI — lot 8e : trois portes s'en servent (Réglages, cloche, tableau de bord). Les gestes du
 *            navigateur vivent dans push-phone.ts.
 * ATTENTION — « activé » se juge sur ce téléphone (un abonnement dans son service worker), jamais
 *            en base. La permission n'est demandée qu'au clic. Après un changement, les autres
 *            portes ouvertes se relisent (événement `flw-push`) : activer dans la cloche fait
 *            disparaître l'invitation du tableau de bord.
 */
import { useCallback, useEffect, useState } from 'react'
import type { PhonePush } from './push-device'
import { readPhone, subscribe, unsubscribe } from './push-phone'

export type PhoneState = PhonePush | 'active' | 'loading'

const CHANGED = 'flw-push'

export function usePhonePush() {
  const [state, setState] = useState<PhoneState>('loading')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function read() {
      const next = await readPhone()
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
