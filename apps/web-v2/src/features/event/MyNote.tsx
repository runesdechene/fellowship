/**
 * QUOI     — « Ma note — visible par toi seul » : une note libre sur la date, quel que soit le statut.
 * POURQUOI — retour bêta (05/11/2026) : la V2 avait perdu les notes de la V1. Emplacement, contact,
 *            ce qu'il faut prévoir (maquette 2789:233). Elle vit dans le dossier privé.
 */
import { DraftInput } from '@/components/ui/DraftInput'
import type { DossierFields } from './useDossier'

interface MyNoteProps {
  note: string | null
  save: (patch: Partial<DossierFields>) => Promise<void>
}

export function MyNote({ note, save }: MyNoteProps) {
  return (
    <section className="event-page__block">
      <h2 className="event-page__block-title">
        Ma note <span className="event-page__block-hint">visible par toi seul</span>
      </h2>
      <DraftInput
        multiline
        className="draft-input--box"
        label="Ma note sur cette date"
        placeholder="Emplacement, contact, ce qu’il faut prévoir…"
        value={note ?? ''}
        onSave={(draft) => void save({ note: draft.trim() || null })}
      />
    </section>
  )
}
