/**
 * QUOI     — le bloc « Notes internes » d'une fiche d'administration : les étiquettes en pastilles,
 *            puis les notes de l'équipe, et de quoi en ajouter.
 * POURQUOI — ce que l'équipe sait d'un compte et que le compte ne voit jamais ; le même bloc sert
 *            la fiche d'une enseigne et celle d'une personne (lib/useAdminNotes.ts).
 * ATTENTION — une écriture refusée s'affiche sous le bloc et la saisie reste : rien n'est perdu.
 */
import { Plus, StickyNote, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { formatDayMonthShort } from '@/lib/dates'
import { useAdminNotes } from '@/lib/useAdminNotes'
import { AdminCard } from './AdminCard'

export function NotesCard({ actorId }: { actorId: string }) {
  const { notes, labels, error, addNote, addLabel, removeLabel } = useAdminNotes(actorId)
  const [draft, setDraft] = useState('')
  const [labelDraft, setLabelDraft] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  async function attempt(job: Promise<void>): Promise<boolean> {
    try {
      await job
      setFailure(null)
      return true
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Enregistrement impossible')
      return false
    }
  }

  async function submitNote() {
    if (!draft.trim()) return
    if (await attempt(addNote(draft))) setDraft('')
  }

  async function submitLabel() {
    if (!labelDraft?.trim() || (await attempt(addLabel(labelDraft)))) setLabelDraft(null)
  }

  function onNoteKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void submitNote()
    }
  }

  function onLabelKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void submitLabel()
    }
    if (event.key === 'Escape') setLabelDraft(null)
  }

  const shown = failure ?? error

  return (
    <AdminCard title="Notes internes" Icon={StickyNote} tone="ocre">
      <div className="notes__labels">
        {labels.map((label) => (
          <span key={label} className="notes__label">
            {label}
            <button
              type="button"
              className="notes__label-remove"
              aria-label={`Retirer l'étiquette ${label}`}
              onClick={() => void attempt(removeLabel(label))}
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
            </button>
          </span>
        ))}
        {labelDraft === null ? (
          <button type="button" className="notes__add-label" onClick={() => setLabelDraft('')}>
            <Plus size={12} strokeWidth={2} aria-hidden="true" />
            Étiquette
          </button>
        ) : (
          <input
            className="notes__label-input"
            aria-label="Nouvelle étiquette"
            autoFocus
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.target.value)}
            onKeyDown={onLabelKey}
            onBlur={() => setLabelDraft(null)}
          />
        )}
      </div>
      {notes.length > 0 && (
        <ul className="notes__list">
          {notes.map((note) => (
            <li key={note.id} className="notes__note">
              <p className="notes__meta">
                {[note.author, formatDayMonthShort(new Date(note.created_at))]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="notes__body">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="notes__form">
        <textarea
          className="notes__input"
          aria-label="Ajouter une note"
          placeholder="Ajouter une note…"
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onNoteKey}
        />
        <button
          type="button"
          className="notes__submit"
          disabled={!draft.trim()}
          onClick={() => void submitNote()}
        >
          Ajouter
        </button>
      </div>
      {shown && (
        <p className="notes__error" role="alert">
          {shown}
        </p>
      )}
    </AdminCard>
  )
}
