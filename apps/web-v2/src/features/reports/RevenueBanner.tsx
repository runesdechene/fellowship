/**
 * QUOI     — le bandeau « Chiffre tes recettes » de Mes bilans : « Garder en clair » ou « Choisir
 *            ma phrase de passe », qui ouvre EncryptDialog sans montants.
 * POURQUOI — maquettes 2580:233 / 2580:720 : une enseigne sans phrase apprend qu'elle peut rendre
 *            ses recettes illisibles pour tous sauf elle. Le refus est gardé en base (keepClear) :
 *            le bandeau ne revient plus, sur aucun appareil.
 * ATTENTION — ReportsPage ne le monte que si revenueInvitation() rend 'banner'. Choisir la phrase
 *            ne chiffre rien : les nouveaux bilans le seront d'office (encryptsByDefault).
 */
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRevenueKey } from '@/lib/revenue-key'
import { EncryptDialog } from './EncryptDialog'

export function RevenueBanner() {
  const { actor } = useAuth()
  const { keepClear } = useRevenueKey()
  const [choosing, setChoosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function keep() {
    setBusy(true)
    setProblem(null)
    try {
      await keepClear()
    } catch {
      setProblem('Ton choix n’a pas pu être enregistré. Réessaie.')
    }
    setBusy(false)
  }

  return (
    <section className="revenue-banner" aria-labelledby="revenue-banner-title">
      <div className="revenue-banner__top">
        <Lock className="revenue-banner__icon" size={18} strokeWidth={1.5} />
        <div className="revenue-banner__text">
          <h2 id="revenue-banner-title" className="revenue-banner__title">
            Chiffre tes recettes
          </h2>
          <p className="revenue-banner__note">
            Une phrase de passe, et tes recettes ne sont lisibles que par toi, pas même par nous.
            Elle vaut pour tous tes nouveaux bilans.
          </p>
          {problem && (
            <p className="report-secret__problem" role="status">
              {problem}
            </p>
          )}
        </div>
      </div>
      <div className="revenue-banner__actions">
        <button
          type="button"
          className="revenue-banner__keep"
          disabled={busy}
          onClick={() => void keep()}
        >
          Garder en clair
        </button>
        <button
          type="button"
          className="revenue-banner__choose"
          onClick={() => {
            setChoosing(true)
          }}
        >
          <Lock size={15} strokeWidth={2} />
          <span>
            Choisir ma phrase<span className="revenue-banner__long"> de passe</span>
          </span>
        </button>
      </div>
      {choosing && (
        <EncryptDialog
          subtitle={actor?.label ?? ''}
          onClose={() => {
            setChoosing(false)
          }}
        />
      )}
    </section>
  )
}
