/**
 * QUOI     — `/evenements/:slug/…` : trouve la fiche par son adresse et la donne aux pages
 *            (`useEventKey`). Une adresse qui n'est pas l'actuelle (ancien slug, identifiant) est
 *            remplacée par l'actuelle, sous-page, recherche et ancre comprises.
 * POURQUOI — des liens lisibles (`fenrir-2027`) sans qu'aucun lien déjà partagé ne casse :
 *            `slug_actuel` (base) connaît tous les slugs qu'une fiche a portés.
 * ATTENTION — une fiche introuvable le dit ; une lecture ratée le dit aussi, sans passer pour une
 *            fiche absente (.claude/rules/v2.md).
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { legacyEventPath } from '@/lib/event-path'
import { must, supabase } from '@/lib/supabase'
import { EventKeyContext, type EventKey } from './useEventKey'

type Lookup = { kind: 'loading' } | ({ kind: 'found' } & EventKey) | { kind: 'missing' | 'failed' }

async function findEvent(key: string): Promise<Lookup> {
  // Le cas courant, le slug actuel, en une requête ; sinon slug_actuel cherche le reste.
  const directResponse = await supabase.from('events').select('id').eq('slug', key).maybeSingle()
  const direct = must(directResponse)
  if (direct) return { kind: 'found', id: direct.id, slug: key }
  const slugResponse = await supabase.rpc('slug_actuel', { p_slug: key })
  const slug = must(slugResponse)
  if (!slug) return { kind: 'missing' }
  const eventResponse = await supabase.from('events').select('id').eq('slug', slug).maybeSingle()
  const event = must(eventResponse)
  return event ? { kind: 'found', id: event.id, slug } : { kind: 'missing' }
}

export function EventRoute({ children }: { children: ReactNode }) {
  const { slug = '' } = useParams()
  const { pathname, search, hash } = useLocation()
  const [lookup, setLookup] = useState<Lookup>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      let result: Lookup
      try {
        result = await findEvent(slug)
      } catch {
        result = { kind: 'failed' }
      }
      if (cancelled) return
      setLookup(result)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (lookup.kind === 'found') {
    if (lookup.slug !== slug) {
      const current = pathname.replace(`/evenements/${slug}`, `/evenements/${lookup.slug}`)
      return <Navigate to={current + search + hash} replace />
    }
    return (
      <EventKeyContext.Provider value={{ id: lookup.id, slug: lookup.slug }}>
        {children}
      </EventKeyContext.Provider>
    )
  }
  return (
    <div className="event-page">
      <p className="event-page__state">
        {lookup.kind === 'loading'
          ? 'Chargement de la fiche…'
          : lookup.kind === 'missing'
            ? 'Cet événement est introuvable.'
            : 'La fiche n’a pas pu se charger. Recharge la page pour réessayer.'}
      </p>
    </div>
  )
}

/** `/evenement/…` et `/e/…` : l'adresse d'avant, quand le service worker sert la page sans Netlify. */
export function LegacyEventRedirect() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={legacyEventPath(pathname) + search + hash} replace />
}
