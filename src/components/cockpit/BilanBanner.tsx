import { useState } from 'react'
import { PartyPopper, X } from 'lucide-react'
import { BilanModal } from '@/components/reports/BilanModal'
import type { BilanPrompt } from '@/lib/cockpit'

interface Props {
  prompt: BilanPrompt
  onSaved: () => void
}

export function BilanBanner({ prompt, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const p = prompt.pending
  if (!p || dismissed) return null

  return (
    <>
      <div className="ck-bilan-banner">
        <span className="ck-bilan-ic"><PartyPopper strokeWidth={1.8} /></span>
        <div className="ck-bilan-txt">
          <b>Comment s'est passé {p.events.name} ?</b>
          <small>
            Note tes revenus, tes coûts et tes impressions.
            {prompt.extraCount > 0 && ` +${prompt.extraCount} autre${prompt.extraCount > 1 ? 's' : ''} en attente.`}
          </small>
        </div>
        <button className="ck-btn ck-btn-p" onClick={() => setOpen(true)}>Remplir mon bilan</button>
        <button className="ck-bilan-x" aria-label="Plus tard" onClick={() => setDismissed(true)}><X strokeWidth={2.2} /></button>
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
