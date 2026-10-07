import { useState } from 'react'
import { Gift, Copy, Check, Award, Link2 } from 'lucide-react'
import { useReferral } from '@/hooks/use-referral'
import './ReferralCard.css'

/**
 * Zone Parrainage de la page Abonnement. Design « ticket » : le code est mis en scène
 * (à dicter à l'oral, au stand), et le lien d'invitation a sa propre action de partage —
 * deux gestes distincts pour les deux canaux d'attribution (oral vs digital).
 */
export function ReferralCard({ entityId, brandName }: { entityId: string; brandName: string | null }) {
  const { code, link, rewardedCount, pendingCount, isAmbassador, loading } = useReferral(entityId, brandName)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  if (loading || !code) return null

  const copy = async (text: string, which: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      if (which === 'code') { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1800) }
      else { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1800) }
    } catch { /* clipboard indispo : l'utilisateur peut sélectionner à la main */ }
  }

  return (
    <section className="ref-card">
      <div className="ref-head">
        <span className="ref-gift"><Gift size={20} strokeWidth={2} /></span>
        <div className="ref-head-txt">
          <h2>Parraine un ami</h2>
          <span className="ref-tagline">Offre un mois, gagne un mois</span>
        </div>
      </div>

      <p className="ref-desc">
        Ton ami exposant a <strong>30 jours de Pro offerts</strong>. Tu gagnes
        <strong> un mois</strong> dès qu'il paie sa 1ʳᵉ facture.
      </p>

      <div className="ref-ticket">
        <span className="ref-ticket-label">Ton code de parrainage</span>
        <div className="ref-ticket-row">
          <span className="ref-code">{code}</span>
          <button
            type="button"
            className="ref-iconbtn"
            onClick={() => copy(code, 'code')}
            aria-label="Copier le code"
          >
            {copiedCode ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2} />}
          </button>
        </div>
        <span className="ref-ticket-hint">À dicter de vive voix, sur ton stand.</span>
      </div>

      {link && (
        <button type="button" className="ref-share" onClick={() => copy(link, 'link')}>
          {copiedLink ? <Check size={17} strokeWidth={2.5} /> : <Link2 size={17} strokeWidth={2} />}
          {copiedLink ? 'Lien copié !' : "Copier mon lien d'invitation"}
        </button>
      )}

      <div className="ref-foot">
        <span className="ref-stats">
          {rewardedCount > 0
            ? <><strong>{rewardedCount}</strong> filleul{rewardedCount > 1 ? 's' : ''} payant{rewardedCount > 1 ? 's' : ''} · {rewardedCount} mois gagné{rewardedCount > 1 ? 's' : ''}</>
            : 'Aucun filleul payant pour l\'instant'}
          {pendingCount > 0 && <span className="ref-pending"> · {pendingCount} en attente de leur 1ʳᵉ facture</span>}
        </span>
        {isAmbassador && (
          <span className="ref-ambassador"><Award size={14} strokeWidth={2} /> Ambassadeur Fellowship</span>
        )}
      </div>
    </section>
  )
}
