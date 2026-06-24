import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
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
    <li className="ck-refuse-row">
      <Link to={eventPath(ev)} className="ck-refuse-link">
        <b>{ev.name}</b>
        <small>{ev.city} · {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</small>
      </Link>
      <textarea
        className="ck-refuse-note"
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={save}
        placeholder="Pourquoi ce refus ? (optionnel)"
        rows={2}
      />
    </li>
  )
}

export function DossiersRefuses({ participations, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  if (participations.length === 0) return null

  return (
    <div className="glass-card ck-card ck-refuses">
      <button className="ck-refuses-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="ck-refuses-title">
          Dossiers refusés ({participations.length})
        </span>
        <ChevronDown className={'ck-refuses-chev' + (open ? ' open' : '')} strokeWidth={2} />
      </button>
      {open && (
        <ul className="ck-list ck-refuses-list">
          {participations.map(p => <RefuseRow key={p.id} p={p} onUpdated={onUpdated} />)}
        </ul>
      )}
    </div>
  )
}
