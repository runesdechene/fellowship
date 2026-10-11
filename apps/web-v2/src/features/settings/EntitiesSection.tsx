/**
 * QUOI     — la section Enseignes et abonnement des Réglages : une ligne par enseigne, son
 *            abonnement en une phrase, et le bon geste (gérer, passer Pro, rien).
 * POURQUOI — lot 9b, maquette 2206:691 : chaque enseigne a sa vitrine et son propre abonnement.
 *            « Gérer » ouvre l'espace Stripe ; « Passer Pro » fait de l'enseigne le compte actif,
 *            puis ouvre l'offre.
 * ATTENTION — « Créer un compte exposant » ouvre l'arrivée sans le prénom (lot 10a) : un seul
 *            formulaire pour les deux. La section s'affiche donc aussi sans enseigne.
 */
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ProBadge } from '@/components/ui/ProBadge'
import { useAuth } from '@/lib/auth'
import { useTransitionNavigate } from '@/lib/navigation'
import { entityLine } from '@/lib/settings'
import { openPortal } from '@/lib/stripe'
import { SettingCard, SettingRow } from './SettingRow'
import { useUpcomingCounts } from './useUpcomingCounts'

export function EntitiesSection() {
  const { entities, switchActor } = useAuth()
  const go = useTransitionNavigate()
  const counts = useUpcomingCounts(entities.map((entity) => entity.actor_id))
  const [failed, setFailed] = useState(false)
  const now = new Date()

  return (
    <section id="enseignes" className="settings-section">
      <div className="settings-section__head">
        <h2 className="settings-section__title">Enseignes et abonnement</h2>
        <p className="settings-section__note">
          Chaque enseigne a sa vitrine et son propre abonnement.
        </p>
      </div>
      <SettingCard>
        {entities.map((entity) => {
          const line = entityLine(entity, now, counts ? (counts.get(entity.actor_id) ?? 0) : null)
          return (
            <SettingRow
              key={entity.actor_id}
              title={entity.brand_name}
              note={line.text}
              badge={line.pro ? <ProBadge /> : undefined}
              leading={
                <Avatar
                  className="setting-row__logo"
                  src={entity.avatar_url}
                  name={entity.brand_name}
                />
              }
            >
              {line.action === 'portal' && (
                <Button
                  onClick={() => {
                    setFailed(false)
                    openPortal(entity.actor_id).catch(() => {
                      setFailed(true)
                    })
                  }}
                >
                  Gérer
                </Button>
              )}
              {line.action === 'upgrade' && (
                <Button
                  variant="action"
                  onClick={() => {
                    switchActor(entity.actor_id)
                    go('/pro')
                  }}
                >
                  Passer Pro
                </Button>
              )}
            </SettingRow>
          )
        })}
        <Link className="setting-create" to="/bienvenue?nouvelle-enseigne">
          <Plus size={14} strokeWidth={2} />
          Créer un compte exposant
        </Link>
      </SettingCard>
      {failed && (
        <p className="settings-section__error">L’espace Stripe ne s’est pas ouvert. Réessaie.</p>
      )}
    </section>
  )
}
