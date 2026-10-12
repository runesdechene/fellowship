/**
 * QUOI     — le siège ou l'atelier d'une enseigne : le lire, le poser (une adresse choisie parmi les
 *            suggestions), l'effacer.
 * POURQUOI — lot 13 : il sert au calcul des distances de la fiche, et n'est jamais affiché ailleurs
 *            (table `entity_bases`, lue par les seuls membres de l'enseigne).
 * ATTENTION — une écriture qui échoue se dit ; on ne laisse pas croire que l'atelier est posé.
 */
import { useEffect, useState } from 'react'
import type { PlaceSuggestion } from '@/lib/geocode'
import { must, supabase } from '@/lib/supabase'

const FAILED = 'L’atelier n’a pas pu être enregistré. Réessaie.'

export function useEntityBase(entityId: string) {
  const [address, setAddress] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const response = await supabase
          .from('entity_bases')
          .select('address')
          .eq('entity_id', entityId)
          .maybeSingle()
        const row = must(response)
        if (cancelled) return
        setAddress(row?.address ?? null)
      } catch {
        if (!cancelled) setError('L’atelier n’a pas pu être lu.')
      }
      if (!cancelled) setLoaded(true)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [entityId])

  async function pick(place: PlaceSuggestion): Promise<void> {
    setError(null)
    const { error: failure } = await supabase.from('entity_bases').upsert({
      entity_id: entityId,
      address: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      updated_at: new Date().toISOString(),
    })
    if (failure) setError(FAILED)
    else setAddress(place.label)
  }

  async function clear() {
    setError(null)
    const { error: failure } = await supabase
      .from('entity_bases')
      .delete()
      .eq('entity_id', entityId)
    if (failure) setError(FAILED)
    else setAddress(null)
  }

  return { address, loaded, error, pick, clear }
}
