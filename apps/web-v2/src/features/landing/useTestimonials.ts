/**
 * QUOI     — les témoignages actifs de la landing, dans l'ordre choisi en admin, avec la vitrine de
 *            chacun (avatar, couverture, adresse).
 * POURQUOI — Uriel, 14/10/2026 : les stories « Ils en parlent mieux que nous ». La table se lit
 *            sans compte (seuls les actifs), comme les entités.
 * ATTENTION — une lecture ratée rend une liste vide : le bouton se cache, jamais d'erreur affichée.
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toTestimonials, type Testimonial, type TestimonialAccount } from '@/lib/testimonials'

async function loadTestimonials(): Promise<Testimonial[]> {
  const rows = await supabase
    .from('testimonials')
    .select('id, name, craft, quote, avatar_url, actor_id, entity_slug')
    .eq('is_active', true)
    .order('sort_order')
    .order('id')
  if (rows.error) return []

  const actors = rows.data.flatMap((t) => (t.actor_id ? [t.actor_id] : []))
  const accounts = new Map<string, TestimonialAccount>()
  if (actors.length > 0) {
    const entities = await supabase
      .from('entities')
      .select('actor_id, avatar_url, banner_url, banner_position, public_slug')
      .in('actor_id', actors)
      .order('actor_id')
    if (!entities.error) {
      for (const e of entities.data) accounts.set(e.actor_id, e)
    }
  }
  return toTestimonials(rows.data, accounts)
}

export function useTestimonials(): Testimonial[] {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const next = await loadTestimonials().catch(() => [])
      if (!cancelled) setTestimonials(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return testimonials
}
