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
  avatars: LandingExposant[]
  loading: boolean
}

const AVATAR_LIMIT = 5
/** Coup de pouce social proof : on gonfle le groupe affiché sur la landing.
 *  Appliqué seulement quand le vrai count a pu être lu (pas sur null/erreur). */
const VIRTUAL_BOOST = 50

export function useLandingExposants(): LandingStats {
  const [stats, setStats] = useState<LandingStats>({ count: null, avatars: [], loading: true })

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
        avatars: rows.map(r => ({ actor_id: r.actor_id, label: r.brand_name, avatar_url: r.avatar_url })),
        loading: false,
      })
    }
    run().catch(() => { if (!cancelled) setStats({ count: null, avatars: [], loading: false }) })
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
 *  Résout le compte lié (entities/users en direct, tous deux anon-OK) pour en dériver
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
      let entityMap: Record<string, { avatar_url: string | null; public_slug: string | null }> = {}
      let userMap: Record<string, { avatar_url: string | null }> = {}
      if (actorIds.length > 0) {
        const [ents, usrs] = await Promise.all([
          supabase.from('entities').select('actor_id, avatar_url, public_slug').in('actor_id', actorIds),
          supabase.from('users').select('actor_id, avatar_url').in('actor_id', actorIds),
        ])
        entityMap = Object.fromEntries((ents.data ?? []).map(e => [e.actor_id, e]))
        userMap = Object.fromEntries((usrs.data ?? []).map(u => [u.actor_id, u]))
      }

      const resolved: DisplayTestimonial[] = list.map(t => {
        const e = t.actor_id ? entityMap[t.actor_id] : undefined
        const u = t.actor_id ? userMap[t.actor_id] : undefined
        return {
          ...t,
          resolvedAvatar: t.avatar_url ?? e?.avatar_url ?? u?.avatar_url ?? null,
          resolvedSlug: t.entity_slug ?? e?.public_slug ?? null,
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
