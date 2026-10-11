/**
 * QUOI     — l'adresse `flw.sh/…` est-elle libre ? Vérifiée 400 ms après la dernière frappe.
 * POURQUOI — lot 10a : « ✓ Libre » ou « Déjà prise » avant de créer la vitrine.
 * ATTENTION — une lecture ratée rend `unknown` : on ne bloque pas, la création tranchera (une
 *            adresse prise la renvoie à l'étape 5).
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type SlugState = 'checking' | 'free' | 'taken' | 'unknown'

const DELAY_MS = 400

export function useSlugFree(slug: string, enabled: boolean): SlugState {
  const [state, setState] = useState<SlugState>('checking')

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void supabase
        .from('entities')
        .select('actor_id', { count: 'exact', head: true })
        .eq('public_slug', slug)
        .then(({ count, error }) => {
          if (cancelled) return
          if (error || count === null) setState('unknown')
          else setState(count > 0 ? 'taken' : 'free')
        })
    }, DELAY_MS)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'attente se dit tout de suite
    setState('checking')
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [slug, enabled])

  return state
}
