/**
 * QUOI     — l'état de la page « Modifier l'événement » : la fiche et sa dernière version chargées,
 *            le formulaire, l'affiche, le mot, et l'enregistrement par la porte d'écriture.
 * POURQUOI — lot 10c : toute modification passe par `modifier_evenement`, qui garde une version et
 *            refuse d'écraser le travail d'un autre (la version attendue).
 * ATTENTION — pas de brouillon dans le navigateur : la page repart toujours de la fiche en base. Les
 *            messages d'erreur de la base sont déjà en français : ils s'affichent tels quels.
 */
import { useCallback, useEffect, useState } from 'react'
import { firstBlockedStep, type EventDraft } from '@/features/event-create/useEventDraft'
import { useAuth } from '@/lib/auth'
import { canEditEvent, changedFields, eventToDraft, type EditableField } from '@/lib/event-edit'
import { locateCity } from '@/lib/geocode'
import { uploadPoster } from '@/lib/poster-upload'
import { must, supabase } from '@/lib/supabase'
import type { EventRow } from '@/types/database'
import type { Json } from '@/types/supabase'

/** L'affiche du formulaire : celle de la fiche (`null`), une nouvelle, ou retirée. */
export type PosterChoice = File | 'removed' | null

interface Loaded {
  event: EventRow
  latestVersion: number | null
}

async function loadEvent(id: string): Promise<Loaded | null> {
  const response = await supabase.from('events').select('*').eq('id', id).maybeSingle()
  const event = must(response)
  if (!event) return null
  const history = must(await supabase.rpc('histoire_evenement', { p_event: id }))
  return { event, latestVersion: history[0]?.id ?? null }
}

export function useEditEvent(id: string) {
  const { person, entities, actor } = useAuth()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [draft, setDraft] = useState<EventDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [poster, setPoster] = useState<PosterChoice>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const result = await loadEvent(id)
        if (cancelled) return
        setLoaded(result)
        setDraft(result ? eventToDraft(result.event) : null)
      } catch (failure) {
        if (cancelled) return
        setError(failure instanceof Error ? failure.message : 'La fiche n’a pas pu être lue.')
      }
      setLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [id])

  const update = useCallback(<K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
    setDraft((previous) => (previous ? { ...previous, [key]: value } : previous))
  }, [])

  const patch = useCallback((fields: Partial<EventDraft>) => {
    setDraft((previous) => (previous ? { ...previous, ...fields } : previous))
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            tags: previous.tags.includes(tag)
              ? previous.tags.filter((existing) => existing !== tag)
              : [...previous.tags, tag],
          }
        : previous,
    )
  }, [])

  const myActorIds = [person?.actor_id, ...entities.map((entity) => entity.actor_id)].filter(
    (value): value is string => Boolean(value),
  )
  const canEdit = loaded ? canEditEvent(loaded.event, myActorIds) : false

  async function save(): Promise<boolean> {
    if (!loaded || !draft) return false
    const blocked = firstBlockedStep(draft)
    if (blocked !== null) {
      setError(
        'Il manque une information obligatoire : le nom, la ville, le département ou le début.',
      )
      return false
    }
    setSaving(true)
    setError(null)
    try {
      let next = draft
      const placeChanged =
        draft.address !== (loaded.event.address ?? '') ||
        draft.city !== loaded.event.city ||
        draft.department !== loaded.event.department
      // Sans adresse choisie parmi les suggestions, la fiche prend la position de sa ville.
      if (placeChanged && draft.geoPrecision === '') {
        const located = await locateCity(draft.city, draft.department)
        if (located) next = { ...draft, ...located, geoPrecision: 'city' }
      }
      const fields: Partial<Record<EditableField, Json>> = changedFields(loaded.event, next)
      if (poster === 'removed') fields.image_url = null
      else if (poster) fields.image_url = await uploadPoster(poster)
      if (Object.keys(fields).length === 0) {
        setError('Rien n’a changé.')
        return false
      }
      const { error: saveError } = await supabase.rpc('modifier_evenement', {
        p_event: loaded.event.id,
        p_fields: fields,
        p_expected_version: loaded.latestVersion ?? undefined,
        p_note: note.trim() || undefined,
        p_as_entity: actor?.kind === 'entity' ? actor.id : undefined,
      })
      if (saveError) {
        setError(saveError.message)
        return false
      }
      return true
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'L’enregistrement a échoué.')
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    event: loaded?.event ?? null,
    draft,
    update,
    patch,
    toggleTag,
    poster,
    setPoster,
    note,
    setNote,
    save,
    saving,
    error,
    loading,
    canEdit,
  }
}
