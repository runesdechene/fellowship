/**
 * QUOI     — « Lancer un sujet » (maquette Story) : le mot, une photo ou une vidéo, qui le voit,
 *            à propos de quelle date. Une fenêtre sur ordinateur, le plein écran sur le papier
 *            décoré sur téléphone (validé par Uriel le 04/11/2026).
 * POURQUOI — on écrit d'abord, la photo vient en second : l'écran ne s'ouvre pas sur l'appareil.
 * ATTENTION — s'ouvre par `?sujet=nouveau` ; le fermer retire le paramètre (le retour du
 *            navigateur le referme aussi). Le premier élément reçoit le clavier : c'est le mot.
 */
import { useEffect, useRef, useState } from 'react'
import { Camera, Globe, ImagePlus, UserCheck, Users, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { useAuth } from '@/lib/auth'
import { todayIso } from '@/lib/dates'
import {
  fetchMyUpcomingEvents,
  publishSujet,
  uploadMedia,
  type EventBrief,
  type Media,
} from '@/lib/discussion-api'
import { AUDIENCES, MOT_MAX, audienceHint, type Audience } from '@/lib/discussions'
import { NEW_SUJET_PARAM, DISCUSSION_PARAM } from './StoryBar'

const AUDIENCE_ICONS = { amis: Users, abonnes: UserCheck, public: Globe }

export function SujetComposer() {
  const [params, setParams] = useSearchParams()
  if (params.get(NEW_SUJET_PARAM) !== 'nouveau') return null
  const close = (opened?: string) => {
    const next = new URLSearchParams(params)
    next.delete(NEW_SUJET_PARAM)
    if (opened) next.set(DISCUSSION_PARAM, opened)
    setParams(next)
  }
  return <ComposerDialog onClose={close} />
}

function ComposerDialog({ onClose }: { onClose: (opened?: string) => void }) {
  const { actor } = useAuth()
  const dialog = useRef<HTMLDialogElement>(null)
  const [mot, setMot] = useState('')
  const [audience, setAudience] = useState<Audience>('amis')
  const [eventId, setEventId] = useState<string | null>(null)
  const [events, setEvents] = useState<EventBrief[]>([])
  const [media, setMedia] = useState<{ file: File; preview: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    if (!actor) return
    let cancelled = false
    const run = async () => {
      try {
        const found = await fetchMyUpcomingEvents(actor.id, todayIso())
        if (!cancelled) setEvents(found)
      } catch {
        // Sans ses dates, le sujet se lance quand même : « À propos de » reste vide.
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [actor])

  useEffect(
    () => () => {
      if (media) URL.revokeObjectURL(media.preview)
    },
    [media],
  )

  function pick(file: File | undefined) {
    if (!file) return
    setMedia({ file, preview: URL.createObjectURL(file) })
  }

  async function publish() {
    if (!actor || !mot.trim() || busy) return
    setBusy(true)
    setProblem(null)
    try {
      let sent: Media | null = null
      if (media) {
        const uploaded = await uploadMedia(actor.id, media.file)
        if (typeof uploaded === 'string') throw new Error(uploaded)
        sent = uploaded
      }
      const id = await publishSujet(actor.id, mot.trim(), audience, eventId, sent)
      onClose(id)
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'La publication a échoué. Réessaie.')
      setBusy(false)
    }
  }

  const video = media?.file.type.startsWith('video/') ?? false

  return (
    <dialog
      ref={dialog}
      className="sujet-composer"
      aria-label="Lancer un sujet"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="sujet-composer__body">
        <textarea
          className="sujet-composer__mot"
          value={mot}
          maxLength={MOT_MAX}
          rows={3}
          placeholder="Ton mot : une question, une info, un covoit’…"
          aria-label="Ton mot"
          onChange={(event) => setMot(event.target.value)}
        />
        <p className="sujet-composer__count">
          {mot.length} / {MOT_MAX}
        </p>

        <div className="sujet-composer__top">
          <Button variant="icon" aria-label="Fermer" onClick={() => onClose()} disabled={busy}>
            <X size={18} strokeWidth={1.75} />
          </Button>
          <h2 className="sujet-composer__title">Lancer un sujet</h2>
        </div>

        <div className="sujet-composer__media">
          {media && (
            <figure className="sujet-composer__photo">
              {video ? (
                <video src={media.preview} muted playsInline />
              ) : (
                <img src={media.preview} alt="" />
              )}
              <button
                type="button"
                className="sujet-composer__remove"
                aria-label="Retirer"
                onClick={() => setMedia(null)}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </figure>
          )}
          <label className="sujet-composer__pick">
            <ImagePlus size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>Photo, vidéo</span>
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(event) => pick(event.target.files?.[0])}
            />
          </label>
          <label className="sujet-composer__pick sujet-composer__camera">
            <Camera size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>Appareil</span>
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              hidden
              onChange={(event) => pick(event.target.files?.[0])}
            />
          </label>
        </div>

        <p className="sujet-composer__label">Qui le voit</p>
        <Segmented
          label="Qui le voit"
          options={AUDIENCES.map(({ value, label }) => ({
            value,
            label,
            Icon: AUDIENCE_ICONS[value],
          }))}
          value={audience}
          onChange={setAudience}
        />

        {events.length > 0 && (
          <>
            <p className="sujet-composer__label">À propos de</p>
            <div className="sujet-composer__events">
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="sujet-composer__event"
                  aria-pressed={eventId === event.id}
                  onClick={() => setEventId(eventId === event.id ? null : event.id)}
                >
                  {event.name}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="sujet-composer__hint">{audienceHint(audience)}</p>
        {problem && (
          <p className="sujet-composer__problem" role="alert">
            {problem}
          </p>
        )}

        <div className="sujet-composer__actions">
          <Button onClick={() => onClose()} disabled={busy}>
            Annuler
          </Button>
          <Button variant="action" onClick={() => void publish()} disabled={busy || !mot.trim()}>
            {busy ? 'Publication…' : 'Publier'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
