/**
 * QUOI     — la note libre d'un bilan, enregistrée en quittant le champ.
 * POURQUOI — ce qu'on veut se rappeler l'an prochain, en ses propres mots.
 * ATTENTION — le brouillon se recale quand la note enregistrée change sous lui (même patron que
 *            components/ui/DraftInput.tsx).
 */
import { useState } from 'react'

export function ReportNote({ note, onSave }: { note: string; onSave: (note: string) => void }) {
  const [draft, setDraft] = useState(note)
  const [known, setKnown] = useState(note)
  if (known !== note) {
    setKnown(note)
    setDraft(note)
  }

  return (
    <section className="report-block">
      <h2 className="report-block__title">Note libre</h2>
      {/* La carte du bloc, et dedans un champ simple, sans ombre (Uriel, 01/11/2026). */}
      <div className="report-card">
        <textarea
          className="report-field report-field--note"
          aria-label="Note libre"
          placeholder="Ce que tu veux te rappeler l’an prochain…"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
          onBlur={() => {
            if (draft !== note) onSave(draft)
          }}
        />
      </div>
    </section>
  )
}
