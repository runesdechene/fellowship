/**
 * QUOI     — charge tous les témoignages (actifs ou non), les enregistre — photo et vitrine reliée
 *            comprises — et les supprime.
 * POURQUOI — la landing lit les actifs (features/landing/useTestimonials.ts) ; ici, les politiques
 *            admin de `testimonials` donnent tout. La vitrine reliée se saisit par son adresse
 *            (`flw.sh/…`) et s'enregistre par son `actor_id`, comme la lit la landing.
 * ATTENTION — une erreur de la base s'affiche telle quelle : jamais une liste vide qui ment.
 */
import { useCallback, useEffect, useState } from 'react'
import { resizeImage } from '@/lib/image-resize'
import { must, supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export type AdminTestimonial = Database['public']['Tables']['testimonials']['Row']

export interface TestimonialDraft {
  name: string
  craft: string
  quote: string
  avatar_url: string | null
  /** L'adresse de la vitrine reliée, sans `flw.sh/` ; vide : aucune. */
  slug: string
  is_active: boolean
  sort_order: number
}

const BUCKET = 'testimonials'
const PHOTO_WIDTH = 400

export async function uploadPhoto(file: File): Promise<string> {
  const blob = await resizeImage(file, PHOTO_WIDTH)
  const path = `${String(Date.now())}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type })
  if (error) throw new Error(error.message)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** L'enseigne derrière une adresse de vitrine ; une adresse inconnue est une erreur, pas un oubli. */
async function actorOf(slug: string): Promise<string | null> {
  if (!slug) return null
  const response = await supabase
    .from('entities')
    .select('actor_id')
    .eq('public_slug', slug)
    .maybeSingle()
  const entity = must(response)
  if (!entity) throw new Error(`Aucune vitrine à l’adresse flw.sh/${slug}`)
  return entity.actor_id
}

export async function saveTestimonial(id: string | null, draft: TestimonialDraft): Promise<void> {
  const { slug, ...fields } = draft
  const row = { ...fields, actor_id: await actorOf(slug), entity_slug: slug || null }
  const { error } = id
    ? await supabase.from('testimonials').update(row).eq('id', id)
    : await supabase.from('testimonials').insert(row)
  if (error) throw new Error(error.message)
}

export async function deleteTestimonial(id: string): Promise<void> {
  const { error } = await supabase.from('testimonials').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Les témoignages, et l'adresse de la vitrine reliée de chacun (par `actor_id`, comme la landing). */
async function loadTestimonials() {
  const testimonials = must(
    await supabase.from('testimonials').select('*').order('sort_order').order('id'),
  )
  const actors = testimonials.flatMap((t) => (t.actor_id ? [t.actor_id] : []))
  const entities = actors.length
    ? must(await supabase.from('entities').select('actor_id, public_slug').in('actor_id', actors))
    : []
  const slugs = new Map(entities.map((e) => [e.actor_id, e.public_slug ?? '']))
  return { testimonials, slugs }
}

export function useAdminTestimonials() {
  const [state, setState] = useState<{
    testimonials: AdminTestimonial[] | null
    slugs: Map<string, string>
    error: string | null
  }>({ testimonials: null, slugs: new Map(), error: null })
  const [round, setRound] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const { testimonials, slugs } = await loadTestimonials()
        if (cancelled) return
        setState({ testimonials, slugs, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          testimonials: null,
          slugs: new Map(),
          error: error instanceof Error ? error.message : 'Chargement impossible',
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [round])
  const reload = useCallback(() => setRound((r) => r + 1), [])
  return { ...state, reload }
}
