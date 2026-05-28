import { Link } from 'react-router-dom'
import { Lock, X } from 'lucide-react'
import { FREE_DATES_QUOTA } from '@/lib/date-quota'
import './DateQuotaModal.css'

/** Mur d'upsell quand une entité gratuite atteint le plafond de dates à venir. */
export function DateQuotaModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="dq-overlay" role="dialog" aria-modal="true" aria-labelledby="dq-title" onClick={onClose}>
      <div className="dq-card" onClick={e => e.stopPropagation()}>
        <button type="button" className="dq-close" aria-label="Fermer" onClick={onClose}><X size={18} strokeWidth={2} /></button>
        <div className="dq-lock"><Lock strokeWidth={1.5} /></div>
        <h2 id="dq-title">Tu suis déjà {FREE_DATES_QUOTA} festivals à venir</h2>
        <p>C'est le maximum en gratuit. Passe Pro pour suivre un <b>nombre illimité</b> de dates — plus le Calendrier, la Communauté et ton Cockpit.</p>
        <Link to="/reglages" className="dq-btn">Passer en Pro — dès 9,99 € HT/mois</Link>
        <button type="button" className="dq-later" onClick={onClose}>Plus tard</button>
      </div>
    </div>
  )
}
