/**
 * QUOI     — les témoignages actifs de la landing, dans l'ordre choisi en admin, avec l'avatar du
 *            compte de chacun.
 * POURQUOI — Uriel, 14/10/2026 : les témoignages reviennent sur la landing. La table se lit sans
 *            compte (seuls les actifs), comme les entités.
 * ATTENTION — une lecture ratée rend une liste vide : la bande se cache, jamais d'erreur affichée.
 */
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toTestimonials, type Testimonial } from '@/lib/testimonials'

async function loadTestimonials(): Promise<Testimonial[]> {
  const rows = await supabase
    .from('testimonials')
    .select('id, name, craft, quote, avatar_url, actor_id')
    .eq('is_active', true)
    .order('sort_order')
    .order('id')
  if (rows.error) return []

  const actors = rows.data.flatMap((t) => (t.actor_id ? [t.actor_id] : []))
  const avatars = new Map<string, string>()
  if (actors.length > 0) {
    const entities = await supabase
      .from('entities')
      .select('actor_id, avatar_url')
      .in('actor_id', actors)
      .order('actor_id')
    if (!entities.error) {
      for (const e of entities.data) if (e.avatar_url) avatars.set(e.actor_id, e.avatar_url)
    }
  }
  return toTestimonials(rows.data, avatars)
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
