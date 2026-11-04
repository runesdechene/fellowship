/**
 * QUOI     — la feuille « Membres » d'un groupe : ajouter des personnes, renommer, sourdine,
 *            quitter (maquette Story).
 * POURQUOI — un groupe se gère sans quitter le tchat ; tout membre ajoute et renomme, chacun
 *            peut partir (spec du 04/11/2026).
 */
import { useEffect, useRef, useState } from 'react'
import { BellOff, LogOut, UserPlus, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import {
  addMembers,
  leaveConversation,
  renameGroup,
  setMuted,
  type ConversationDetail,
} from '@/lib/discussion-api'
import type { Person } from '@/lib/discussions'
import { PeoplePicker } from './PeoplePicker'

interface Props {
  detail: ConversationDetail
  onClose: () => void
  onChanged: () => void
  onLeft: () => void
}

export function MembersSheet({ detail, onClose, onChanged, onLeft }: Props) {
  const { actor } = useAuth()
  const dialog = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(detail.title ?? '')
  const [adding, setAdding] = useState<Person[] | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const me = detail.members.find((member) => member.id === actor?.id)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function act(action: () => Promise<void>, after: () => void) {
    setProblem(null)
    try {
      await action()
      after()
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Ça n’a pas marché. Réessaie.')
    }
  }

  if (!actor) return null

  return (
    <dialog
      ref={dialog}
      className="members-sheet"
      aria-label="Membres du groupe"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="members-sheet__body">
        <input
          className="members-sheet__title"
          value={title}
          maxLength={60}
          placeholder="Nom du groupe"
          aria-label="Nom du groupe"
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (title !== (detail.title ?? ''))
              void act(() => renameGroup(actor.id, detail.id, title), onChanged)
          }}
        />
        <p className="members-sheet__count">{detail.members.length} membres</p>
        <Button
          variant="bare"
          className="members-sheet__close"
          aria-label="Fermer"
          onClick={onClose}
        >
          <X size={18} strokeWidth={1.75} />
        </Button>

        <div className="members-sheet__actions">
          <button type="button" className="members-sheet__action" onClick={() => setAdding([])}>
            <UserPlus size={20} strokeWidth={1.75} aria-hidden="true" />
            Ajouter
          </button>
          <button
            type="button"
            className="members-sheet__action"
            aria-pressed={me?.muted ?? false}
            onClick={() =>
              void act(() => setMuted(actor.id, detail.id, !(me?.muted ?? false)), onChanged)
            }
          >
            <BellOff size={20} strokeWidth={1.75} aria-hidden="true" />
            {me?.muted ? 'Sourdine activée' : 'Sourdine'}
          </button>
        </div>

        {adding && (
          <div className="members-sheet__add">
            <PeoplePicker
              chosen={adding}
              onChange={setAdding}
              exclude={detail.members.map((member) => member.id)}
            />
            <Button
              variant="action"
              disabled={adding.length === 0}
              onClick={() =>
                void act(
                  () =>
                    addMembers(
                      actor.id,
                      detail.id,
                      adding.map((person) => person.id),
                    ),
                  () => {
                    setAdding(null)
                    onChanged()
                  },
                )
              }
            >
              Ajouter au groupe
            </Button>
          </div>
        )}

        <ul className="members-sheet__list">
          {detail.members.map((member) => (
            <li key={member.id} className="members-sheet__member">
              <Avatar className="members-sheet__avatar" src={member.avatar} name={member.label} />
              <span className="members-sheet__name">
                {member.id === actor.id ? 'Toi' : member.label}
              </span>
              {member.id === detail.createdBy && (
                <span className="members-sheet__role">A créé le groupe</span>
              )}
            </li>
          ))}
        </ul>

        {problem && (
          <p className="members-sheet__problem" role="alert">
            {problem}
          </p>
        )}
        <button
          type="button"
          className="members-sheet__leave"
          onClick={() => void act(() => leaveConversation(actor.id, detail.id), onLeft)}
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
          Quitter le groupe
        </button>
      </div>
    </dialog>
  )
}
