import { useState } from 'react'
import { Link } from 'react-router-dom'
import { eventPath } from '@/lib/event-link'
import { updateParticipation } from '@/hooks/use-participations'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  /** Participations déjà filtrées sur le statut 'refuse' (cf. selectRefusedDossiers). */
  participations: ParticipationWithEvent[]
  onUpdated: () => void
}

function RefuseRow({ p, onUpdated }: { p: ParticipationWithEvent; onUpdated: () => void }) {
  const ev = p.events
  const [note, setNote] = useState((p.refusal_note as string | null) ?? '')

  const save = async () => {
    if (((p.refusal_note as string | null) ?? '') === note.trim()) return
    const { data } = await updateParticipation(p.id, { refusal_note: note.trim() || null })
    if (data) onUpdated()
  }

  return (
    <li className="ck2-li ck2-refus-row">
      <Link to={eventPath(ev)} className="ck2-txt">
        <span className="ck2-t">{ev.name}</span>
        <span className="ck2-s">{ev.city} · {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </Link>
      <textarea
        className="ck2-refus-note"
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={save}
        placeholder="Pourquoi ce refus ? (optionnel)"
        rows={2}
      />
    </li>
  )
}

/** Reprise de DossiersRefuses.tsx (V1) — même updateParticipation, même sauvegarde de
 *  la note au blur — mais repliée dans un <details> fermé par défaut. */
export function DossiersRefusesV2({ participations, onUpdated }: Props) {
  if (participations.length === 0) return null

  return (
    <details className="ck2-block ck2-refus">
      <summary>
        <span className="app2-label">Dossiers refusés</span>
        <span className="app2-faint">{participations.length}</span>
      </summary>
      <ul className="ck2-list">
        {participations.map(p => <RefuseRow key={p.id} p={p} onUpdated={onUpdated} />)}
      </ul>
    </details>
  )
}
