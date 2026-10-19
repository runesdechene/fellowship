/**
 * QUOI     — `/e/:slug`, l'ancien lien partagé d'un événement : il mène à sa fiche `/evenement/:id`.
 * POURQUOI — lot 12 : la V1 partageait ses fiches par leur slug, et ces liens circulent encore
 *            (réseaux, sites, favoris). La V2 ne connaît que l'identifiant.
 * ATTENTION — un slug inconnu dit « introuvable », comme un identifiant inconnu ; une lecture ratée
 *            le dit aussi, sans faire passer la coupure pour une fiche absente (.claude/rules/v2.md).
 */
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { must, supabase } from '@/lib/supabase'

type Lookup = { kind: 'loading' } | { kind: 'found'; id: string } | { kind: 'missing' | 'failed' }

async function findEvent(slug: string): Promise<Lookup> {
  const response = await supabase.from('events').select('id').eq('slug', slug).maybeSingle()
  const event = must(response)
  return event ? { kind: 'found', id: event.id } : { kind: 'missing' }
}

export function EventSlugRedirect() {
  const { slug = '' } = useParams()
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

  if (lookup.kind === 'found') return <Navigate to={`/evenement/${lookup.id}`} replace />
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
