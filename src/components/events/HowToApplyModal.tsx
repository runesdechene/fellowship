import { useState } from 'react'
import { X, Mail, ExternalLink, StickyNote, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Event } from '@/types/database'

interface HowToApplyModalProps {
  event: Event
  onClose: () => void
  /** Marque la participation comme « Dossier envoyé » (status en_cours). */
  onMarkApplied: () => void
}

/**
 * Modale « Comment candidater » — version lite, câblée sur la data existante
 * (contact_email / registration_url / registration_note). Pas de téléphone,
 * contact nominatif ni corrections communautaires (→ spec dédiée ultérieure).
 * Le parent ne la monte que si hasApplyInfo(event) est vrai.
 */
export function HowToApplyModal({ event, onClose, onMarkApplied }: HowToApplyModalProps) {
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    if (!event.contact_email) return
    try {
      await navigator.clipboard.writeText(event.contact_email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indisponible — silencieux */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card howto-modal" onClick={(e) => e.stopPropagation()}>
        <div className="howto-head">
          <h2>Comment candidater</h2>
          <button onClick={onClose} className="howto-x" aria-label="Fermer">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <p className="howto-sub">
          La candidature se fait directement auprès de l'organisateur. Voici les moyens connus :
        </p>

        <div className="howto-list">
          {event.contact_email && (
            <div className="howto-item">
              <Mail strokeWidth={1.8} className="howto-item-ic" />
              <div className="howto-item-cc">
                <small>Email</small>
                <b>{event.contact_email}</b>
              </div>
              <button className="howto-item-btn" onClick={copyEmail}>
                {copied ? <><Check strokeWidth={2} /> Copié</> : <><Copy strokeWidth={2} /> Copier</>}
              </button>
            </div>
          )}

          {event.registration_url && (
            <a
              className="howto-item"
              href={event.registration_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink strokeWidth={1.8} className="howto-item-ic" />
              <div className="howto-item-cc">
                <small>Lien d'inscription</small>
                <b>Ouvrir le formulaire / dossier</b>
              </div>
              <span className="howto-item-btn">Ouvrir</span>
            </a>
          )}

          {event.registration_note && (
            <div className="howto-item">
              <StickyNote strokeWidth={1.8} className="howto-item-ic" />
              <div className="howto-item-cc">
                <small>Note de l'organisateur</small>
                <b className="howto-note">{event.registration_note}</b>
              </div>
            </div>
          )}
        </div>

        <div className="howto-foot">
          <span>Tu as envoyé ta candidature ?</span>
          <Button size="sm" onClick={() => { onMarkApplied(); onClose() }}>
            <Check className="mr-1.5 h-4 w-4" strokeWidth={2} /> Marquer comme candidaté
          </Button>
        </div>
      </div>
    </div>
  )
}
