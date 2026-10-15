import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Testimonial } from '@/types/database'

export interface LandingExposant {
  actor_id: string
  label: string | null
  avatar_url: string | null
}

export interface LandingStats {
  count: number | null
  /** Le vrai compte, sans le VIRTUAL_BOOST — la V2 plaide l'honnêteté et ne
   *  peut pas afficher un chiffre gonflé. Le boost reste réservé à la V1. */
  realCount: number | null
  avatars: LandingExposant[]
  loading: boolean
}

const AVATAR_LIMIT = 5
/** Coup de pouce social proof : on gonfle le groupe affiché sur la landing.
 *  Appliqué seulement quand le vrai count a pu être lu (pas sur null/erreur). */
const VIRTUAL_BOOST = 50

export function useLandingExposants(): LandingStats {
  const [stats, setStats] = useState<LandingStats>({ count: null, realCount: null, avatars: [], loading: true })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const [countRes, avatarsRes] = await Promise.all([
        supabase.from('entities').select('actor_id', { count: 'exact', head: true }).eq('type', 'exposant'),
        supabase.from('entities').select('actor_id, brand_name, avatar_url')
          .eq('type', 'exposant').not('avatar_url', 'is', null)
          .order('created_at', { ascending: false }).limit(AVATAR_LIMIT),
      ])
      if (cancelled) return
      const rows = (avatarsRes.data ?? []) as Array<{ actor_id: string; brand_name: string | null; avatar_url: string | null }>
      setStats({
        count: countRes.count != null ? countRes.count + VIRTUAL_BOOST : null,
        realCount: countRes.count,
        avatars: rows.map(r => ({ actor_id: r.actor_id, label: r.brand_name, avatar_url: r.avatar_url })),
        loading: false,
      })
    }
    run().catch(() => { if (!cancelled) setStats({ count: null, realCount: null, avatars: [], loading: false }) })
    return () => { cancelled = true }
  }, [])

  return stats
}

/** Témoignage enrichi du compte lié : avatar de secours + slug vitrine. */
export type DisplayTestimonial = Testimonial & {
  /** Avatar à afficher : image saisie > avatar du compte lié > null (→ initiales). */
  resolvedAvatar: string | null
  /** Slug vitrine pour le lien sur la tête : entity_slug saisi > slug du compte lié (entité). */
  resolvedSlug: string | null
}

/** Témoignages actifs pour la Landing. Lecture anonyme (RLS public = actifs only).
 *  Résout le compte lié (actor_public, anon-OK) pour en dériver
 *  l'avatar de secours et le lien vitrine. */
export function useTestimonials(): { testimonials: DisplayTestimonial[]; loading: boolean } {
  const [state, setState] = useState<{ testimonials: DisplayTestimonial[]; loading: boolean }>({
    testimonials: [],
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      const list = data ?? []

      const actorIds = [...new Set(list.map(t => t.actor_id).filter((x): x is string => !!x))]
      let actorMap: Record<string, { avatar_url: string | null; public_slug: string | null }> = {}
      if (actorIds.length > 0) {
        // actor_public : personnes et enseignes, sans e-mail — `users` n'est plus lisible par les autres.
        const { data: actors } = await supabase
          .from('actor_public').select('actor_id, avatar_url, public_slug').in('actor_id', actorIds)
        actorMap = Object.fromEntries((actors ?? []).flatMap(a => a.actor_id ? [[a.actor_id, a]] : []))
      }

      const resolved: DisplayTestimonial[] = list.map(t => {
        const a = t.actor_id ? actorMap[t.actor_id] : undefined
        return {
          ...t,
          resolvedAvatar: t.avatar_url ?? a?.avatar_url ?? null,
          resolvedSlug: t.entity_slug ?? a?.public_slug ?? null,
        }
      })
      if (cancelled) return
      setState({ testimonials: resolved, loading: false })
    }
    run().catch(() => { if (!cancelled) setState({ testimonials: [], loading: false }) })
    return () => { cancelled = true }
  }, [])

  return state
}
