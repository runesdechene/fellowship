/**
 * QUOI     — la question à poser, en tête du fil de la fiche : une ligne qui s'ouvre en champ.
 * POURQUOI — maquette 2529:233 (25/10/2026), « prendre les gens par la main » : le champ sans cadre
 *            dit où écrire, des idées pour démarrer, les précisions seulement si on les demande.
 * ATTENTION — la raison d'un refus (question trop courte, trop longue) ne s'affiche qu'après un
 *            essai de publication : avant, elle grondait quelqu'un qui n'avait encore rien fait.
 */
import { useRef, useState } from 'react'
import { ArrowUp, Bed, Car, Clock, Plus, Tent, Users, Zap, type LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { askBlocker, channelLabel, type ThreadAudience } from '@/lib/threads'
import type { Me } from './DiscussionThread'

/** Ce qu'on demande souvent sur un festival : un clic écrit le début de la question. */
const IDEAS: { Icon: LucideIcon; label: string; question: string }[] = [
  { Icon: Zap, label: 'Électricité', question: 'L’électricité est-elle fournie sur les stands ?' },
  { Icon: Tent, label: 'Montage', question: 'À quelle heure peut-on monter le stand ?' },
  { Icon: Car, label: 'Parking', question: 'Où se garer pour décharger ?' },
  { Icon: Bed, label: 'Dormir sur place', question: 'Peut-on dormir sur place ?' },
  { Icon: Clock, label: 'Horaires', question: 'Quels sont les horaires d’ouverture au public ?' },
]

interface ComposerProps {
  me: Me
  audience: ThreadAudience | null
  open: boolean
  setOpen: (open: boolean) => void
  saving: boolean
  onAsk: (title: string, body: string) => void
}

export function DiscussionComposer({ me, audience, open, setOpen, saving, onAsk }: ComposerProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [detailing, setDetailing] = useState(false)
  const [tried, setTried] = useState(false)
  const question = useRef<HTMLTextAreaElement>(null)
  const blocker = askBlocker(title, body)

  if (!open) {
    return (
      <button type="button" className="composer" onClick={() => setOpen(true)}>
        <Avatar className="composer__photo" src={me.avatarUrl} name={me.name} />
        <span className="composer__text">
          <span className="composer__name">{me.name}</span>
          <span className="composer__prompt">
            {audience === 'organisateur'
              ? 'Pose ta question aux autres organisateurs…'
              : 'Pose ta question aux exposants qui y sont allés…'}
          </span>
        </span>
        <span className="composer__publish">Publier</span>
      </button>
    )
  }

  const close = () => {
    setTitle('')
    setBody('')
    setDetailing(false)
    setTried(false)
    setOpen(false)
  }

  const publish = () => {
    if (blocker || !audience) {
      setTried(true)
      return
    }
    onAsk(title, body)
    close()
  }

  return (
    <div className="composer composer--open">
      <div className="composer__body">
        <Avatar className="composer__photo" src={me.avatarUrl} name={me.name} />
        <div className="composer__form">
          <p className="composer__head">
            <span className="composer__name">{me.name}</span>
            {audience && (
              <span className="composer__audience">
                <Users size={12} strokeWidth={2} />
                Les {channelLabel(audience).toLowerCase()} te répondront
              </span>
            )}
          </p>
          <textarea
            ref={question}
            className="composer__question"
            rows={1}
            autoFocus
            aria-label="Ta question"
            placeholder="Quelle est ta question ?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          {tried && blocker && (
            <p className="composer__error" role="alert">
              {blocker}
            </p>
          )}
          {title.trim() === '' && (
            <div className="composer__ideas">
              <span className="composer__ideas-label">Ce qu’on demande souvent</span>
              <div className="composer__chips">
                {IDEAS.map(({ Icon, label, question: idea }) => (
                  <button
                    key={label}
                    type="button"
                    className="composer__chip"
                    onClick={() => {
                      setTitle(idea)
                      question.current?.focus()
                    }}
                  >
                    <Icon size={14} strokeWidth={1.9} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {detailing ? (
            <textarea
              className="composer__detail"
              rows={2}
              autoFocus
              aria-label="Tes précisions"
              placeholder="Ce qui aidera à te répondre…"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          ) : (
            <button type="button" className="composer__more" onClick={() => setDetailing(true)}>
              <Plus size={14} strokeWidth={2} />
              Ajouter des précisions
            </button>
          )}
        </div>
      </div>
      <div className="composer__foot">
        <button type="button" className="message__action" onClick={close}>
          Annuler
        </button>
        <button
          type="button"
          className="composer__publish"
          disabled={saving || title.trim() === ''}
          onClick={publish}
        >
          Publier
          <ArrowUp size={14} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
