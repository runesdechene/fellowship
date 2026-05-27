import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { reorderPositions } from '@/lib/vitrine-edit'
import type { EntityGalleryRow } from '@/types/database'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface VitrineEditApi {
  status: SaveStatus
  /** Patch partiel de l'entité (bio, brand_name, specialties, links…). Renvoie true si OK. */
  updateEntity: (patch: Record<string, unknown>) => Promise<boolean>
  /** Upload une image dans entity-gallery sous <actor_id>/<kind>/… et renvoie l'URL publique. */
  uploadImage: (file: File, kind: 'cover' | 'avatar' | 'gallery') => Promise<string | null>
  /** Upload N fichiers en galerie + insère les lignes ; renvoie les nouvelles lignes. */
  addGalleryImages: (files: File[], currentCount: number) => Promise<EntityGalleryRow[]>
  removeGalleryImage: (id: string) => Promise<boolean>
  /** Persiste l'ordre (positions séquentielles) d'après la liste d'ids ordonnée. */
  reorderGallery: (orderedIds: string[]) => Promise<boolean>
}

export function useVitrineEdit(actorId: string): VitrineEditApi {
  const [status, setStatus] = useState<SaveStatus>('idle')

  const flash = useCallback((s: SaveStatus) => {
    setStatus(s)
    if (s === 'saved' || s === 'error') setTimeout(() => setStatus('idle'), 2500)
  }, [])

  const updateEntity = useCallback(async (patch: Record<string, unknown>) => {
    setStatus('saving')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('entities') as any).update(patch).eq('actor_id', actorId)
    if (error) { console.error('updateEntity', error); flash('error'); return false }
    flash('saved'); return true
  }, [actorId, flash])

  const uploadImage = useCallback(async (file: File, kind: 'cover' | 'avatar' | 'gallery') => {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${actorId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('entity-gallery').upload(path, file, { upsert: true })
    if (error) { console.error('uploadImage', error); return null }
    return supabase.storage.from('entity-gallery').getPublicUrl(path).data.publicUrl
  }, [actorId])

  const addGalleryImages = useCallback(async (files: File[], currentCount: number) => {
    setStatus('saving')
    const rows: EntityGalleryRow[] = []
    let pos = currentCount
    for (const file of files) {
      const url = await uploadImage(file, 'gallery')
      if (!url) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('entity_gallery') as any)
        .insert({ entity_actor_id: actorId, image_url: url, position: pos }).select('*').single()
      if (error) { console.error('addGallery', error); flash('error'); continue }
      rows.push(data as EntityGalleryRow); pos += 1
    }
    flash(rows.length ? 'saved' : 'error')
    return rows
  }, [actorId, uploadImage, flash])

  const removeGalleryImage = useCallback(async (id: string) => {
    setStatus('saving')
    const { error } = await supabase.from('entity_gallery').delete().eq('id', id)
    if (error) { console.error('removeGallery', error); flash('error'); return false }
    flash('saved'); return true
  }, [flash])

  const reorderGallery = useCallback(async (orderedIds: string[]) => {
    setStatus('saving')
    for (const { id, position } of reorderPositions(orderedIds)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('entity_gallery') as any).update({ position }).eq('id', id)
      if (error) { console.error('reorderGallery', error); flash('error'); return false }
    }
    flash('saved'); return true
  }, [flash])

  return { status, updateEntity, uploadImage, addGalleryImages, removeGalleryImage, reorderGallery }
}
