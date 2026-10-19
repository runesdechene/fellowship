/**
 * QUOI     — `/:slug` : la vitrine, ou une adresse de la V1 qui y mène (`/@slug`, l'identifiant de
 *            l'acteur), remplacée par l'adresse de la vitrine.
 * POURQUOI — lot 12 : la V1 donnait partout ses vitrines en `/@slug` ; ces liens sont dans des
 *            favoris, des bios Instagram, des sites. Ils doivent mener à la vitrine.
 * ATTENTION — un identifiant sans vitrine (ou une lecture ratée) retombe sur la vitrine, qui dit
 *            « Cette vitrine n'existe pas » comme pour un slug inconnu.
 */
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { must, supabase } from '@/lib/supabase'
import { vitrineAddress } from '@/lib/vitrine'
import { VitrinePage } from './VitrinePage'

type Lookup = { kind: 'loading' } | { kind: 'found'; slug: string } | { kind: 'none' }

async function findSlug(actorId: string): Promise<Lookup> {
  const response = await supabase
    .from('entities')
    .select('public_slug')
    .eq('actor_id', actorId)
    .maybeSingle()
  const slug = must(response)?.public_slug
  return slug ? { kind: 'found', slug } : { kind: 'none' }
}

function ActorRedirect({ actorId }: { actorId: string }) {
  const [lookup, setLookup] = useState<Lookup>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      let next: Lookup
      try {
        next = await findSlug(actorId)
      } catch {
        next = { kind: 'none' }
      }
      if (cancelled) return
      setLookup(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [actorId])

  if (lookup.kind === 'loading') return null
  if (lookup.kind === 'found') return <Navigate to={`/${lookup.slug}`} replace />
  return <VitrinePage />
}

export function VitrineRoute() {
  const address = vitrineAddress(useParams().slug ?? '')
  if (address.kind === 'redirect') return <Navigate to={address.to} replace />
  if (address.kind === 'actor') return <ActorRedirect actorId={address.id} />
  return <VitrinePage />
}
