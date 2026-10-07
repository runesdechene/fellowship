import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface VitrineEditApi {
  status: SaveStatus
  /** Patch partiel de l'entité (bio, brand_name, location, links…). Renvoie true si OK. */
  updateEntity: (patch: Record<string, unknown>) => Promise<boolean>
  /** Upload une image dans entity-gallery sous <actor_id>/<kind>/… et renvoie l'URL publique. */
  uploadImage: (file: File, kind: 'cover' | 'avatar') => Promise<string | null>
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

  const uploadImage = useCallback(async (file: File, kind: 'cover' | 'avatar') => {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${actorId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('entity-gallery').upload(path, file, { upsert: true })
    if (error) { console.error('uploadImage', error); return null }
    return supabase.storage.from('entity-gallery').getPublicUrl(path).data.publicUrl
  }, [actorId])

  return { status, updateEntity, uploadImage }
}
