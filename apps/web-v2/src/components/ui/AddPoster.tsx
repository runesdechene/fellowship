/**
 * QUOI     — le petit bouton « Ajouter une affiche », en bas à droite d'une grande affiche absente :
 *            il ouvre le choix d'une image, l'envoie et l'enregistre sur la fiche.
 * POURQUOI — Uriel, 21/10/2026 : compléter les affiches manquantes sans passer par « Modifier ».
 *            Même porte d'écriture que la modification (`modifier_evenement`), qui garde les droits.
 * ATTENTION — l'affiche vit souvent dans un lien vers la fiche : le clic ne doit pas y naviguer.
 *            `labeled` écrit le texte à côté de l'icône (le mur de la fiche, PosterWall.tsx).
 */
import { ImagePlus } from 'lucide-react'
import { useRef, useState, type MouseEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { uploadPoster } from '@/lib/poster-upload'
import { supabase } from '@/lib/supabase'

interface AddPosterProps {
  eventId: string
  onAdded: (imageUrl: string) => void
  labeled?: boolean
}

export function AddPoster({ eventId, onAdded, labeled = false }: AddPosterProps) {
  const { actor } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!actor) return null

  function open(click: MouseEvent) {
    click.preventDefault()
    click.stopPropagation()
    input.current?.click()
  }

  async function send(file: File) {
    setSending(true)
    setError(null)
    try {
      const imageUrl = await uploadPoster(file)
      const { error: saveError } = await supabase.rpc('modifier_evenement', {
        p_event: eventId,
        p_fields: { image_url: imageUrl },
        p_as_entity: actor?.kind === 'entity' ? actor.id : undefined,
      })
      if (saveError) throw new Error(saveError.message)
      onAdded(imageUrl)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'L’affiche n’a pas pu être ajoutée.')
    } finally {
      setSending(false)
    }
  }

  const label = error ?? 'Ajouter une affiche'
  return (
    <>
      <button
        type="button"
        className={['add-poster', labeled && 'add-poster--labeled', error && 'add-poster--error']
          .filter(Boolean)
          .join(' ')}
        aria-label={label}
        title={label}
        disabled={sending}
        onClick={open}
      >
        <ImagePlus size={labeled ? 16 : 14} strokeWidth={2} />
        {labeled && label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onClick={(click) => {
          click.stopPropagation()
        }}
        onChange={(change) => {
          const file = change.target.files?.[0]
          change.target.value = ''
          if (file) void send(file)
        }}
      />
    </>
  )
}
