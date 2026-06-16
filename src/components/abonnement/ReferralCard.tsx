import { useState } from 'react'
import { Gift, Copy, Check, Award } from 'lucide-react'
import { useReferral } from '@/hooks/use-referral'

/** Carte Parrainage dans la page Abonnement : code, lien à copier, compteur, statut Ambassadeur. */
export function ReferralCard({ entityId, brandName }: { entityId: string; brandName: string | null }) {
  const { code, link, rewardedCount, pendingCount, isAmbassador, loading } = useReferral(entityId, brandName)
  const [copied, setCopied] = useState(false)

  if (loading || !code) return null

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard indispo : l'utilisateur peut sélectionner le lien à la main */ }
  }

  return (
    <div className="abo-card">
      <h2><Gift size={18} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 6 }} />Parraine un ami</h2>
      <p>Offre un mois, gagne un mois. Ton ami a <strong>30 jours de Pro offerts</strong> ; tu gagnes <strong>un mois</strong> dès qu'il paie sa 1ʳᵉ facture.</p>

      <div className="field" style={{ marginTop: 12 }}>
        <label>Ton code</label>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '0.04em' }}>{code}</div>
      </div>

      <button type="button" className="abo-cta" onClick={copy} style={{ marginTop: 12 }}>
        {copied ? <Check strokeWidth={2} /> : <Copy strokeWidth={2} />}
        {copied ? 'Lien copié !' : 'Copier mon lien de parrainage'}
      </button>

      <p className="abo-muted" style={{ marginTop: 12 }}>
        {rewardedCount > 0
          ? <><strong>{rewardedCount}</strong> filleul{rewardedCount > 1 ? 's' : ''} payant{rewardedCount > 1 ? 's' : ''} · {rewardedCount} mois gagné{rewardedCount > 1 ? 's' : ''}.</>
          : 'Aucun filleul payant pour l\'instant.'}
        {pendingCount > 0 && <> {pendingCount} en attente de leur 1ʳᵉ facture.</>}
      </p>

      {isAmbassador && (
        <p style={{ marginTop: 8, color: 'var(--copper)', fontWeight: 700 }}>
          <Award size={16} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 4 }} />
          Tu es Ambassadeur Fellowship.
        </p>
      )}
    </div>
  )
}
