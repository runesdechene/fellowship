import { useState } from 'react'
import { X, Copy, Check, Share2 } from 'lucide-react'
import './ShareModal.css'

interface ShareModalProps {
  /** Message pré-rédigé (éditable), lien inclus. */
  message: string
  /** Lien seul, copiable à part. */
  url: string
  onClose: () => void
}

/**
 * Modale de partage Fellowship — message pré-rédigé éditable + copier.
 * Pas de plateforme imposée : l'utilisateur colle où il veut. Bouton « Partager… »
 * (feuille native) ajouté en bonus uniquement si le navigateur le supporte.
 */
export function ShareModal({ message, url, onClose }: ShareModalProps) {
  const [text, setText] = useState(message)
  const [copied, setCopied] = useState<'text' | 'url' | null>(null)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = async (value: string, which: 'text' | 'url') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      setTimeout(() => setCopied(null), 1800)
    } catch { /* presse-papier refusé */ }
  }

  const nativeShare = async () => {
    try { await navigator.share({ text }) } catch { /* partage annulé */ }
  }

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-head">
          <h2>Partager</h2>
          <button onClick={onClose} aria-label="Fermer"><X strokeWidth={1.8} /></button>
        </div>
        <p className="share-sub">Copie ce message et colle-le où tu veux — WhatsApp, SMS, mail, réseaux…</p>

        <textarea className="share-text" value={text} onChange={e => setText(e.target.value)} rows={4} />
        <button className="share-btn share-btn-p" onClick={() => copy(text, 'text')}>
          {copied === 'text' ? <><Check strokeWidth={2.2} /> Copié</> : <><Copy strokeWidth={2} /> Copier le texte</>}
        </button>

        <div className="share-link">
          <span className="share-link-url">{url}</span>
          <button className="share-link-copy" onClick={() => copy(url, 'url')} aria-label="Copier le lien">
            {copied === 'url' ? <Check strokeWidth={2.2} /> : <Copy strokeWidth={2} />}
          </button>
        </div>

        {canShare && (
          <button className="share-btn share-btn-g" onClick={nativeShare}><Share2 strokeWidth={2} /> Partager…</button>
        )}
      </div>
    </div>
  )
}
