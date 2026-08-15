import { useState } from 'react'
import { BilanModal } from '@/components/reports/BilanModal'
import type { BilanPrompt } from '@/lib/cockpit'

interface Props {
  prompt: BilanPrompt
  onSaved: () => void
  /** « Plus tard » : snooze l'event affiché jusqu'au lendemain (persisté). */
  onSnooze: (eventId: string) => void
}

/** Reprend BilanBanner.tsx (V1) : même prop, même BilanModal, même snooze — mais en
 *  une ligne calme : une seule action visible, « plus tard » en lien discret (la
 *  V1 avait aussi une croix séparée qui faisait double emploi avec « plus tard »). */
export function BilanLigneV2({ prompt, onSaved, onSnooze }: Props) {
  const [open, setOpen] = useState(false)
  const p = prompt.pending
  if (!p) return null

  return (
    <>
      <div className="ck2-bilan">
        <span className="ck2-bilan-lead">
          <span className="ck2-dot ck2-wait" aria-hidden="true" />
          <span className="ck2-bilan-txt">
            Comment s'est passé <b>{p.events.name}</b> ?
            {prompt.extraCount > 0 && <span className="app2-faint"> +{prompt.extraCount} en attente</span>}
          </span>
        </span>
        <span className="ck2-bilan-actions">
          <button className="ck2-bilan-go" onClick={() => setOpen(true)}>Remplir mon bilan</button>
          <button className="ck2-bilan-later" onClick={() => onSnooze(p.event_id)} aria-label="Plus tard">Plus tard</button>
        </span>
      </div>
      {open && (
        <BilanModal
          eventId={p.event_id}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); onSaved() }}
        />
      )}
    </>
  )
}
