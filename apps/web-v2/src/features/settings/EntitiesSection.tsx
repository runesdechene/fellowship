/**
 * QUOI     — la section Enseignes et abonnement des Réglages : une ligne par enseigne, son
 *            abonnement en une phrase, la pastille de son paiement (maquette 2558:233), le bon
 *            geste (gérer, passer Pro, rien), et Supprimer… ; sous une enseigne abonnée, sa
 *            facturation (raison sociale, SIREN).
 * POURQUOI — lot 9b, maquette 2206:691 : chaque enseigne a sa vitrine et son propre abonnement.
 *            « Gérer » ouvre l'espace Stripe ; « Passer Pro » fait de l'enseigne le compte actif,
 *            puis ouvre l'offre.
 * ATTENTION — « Créer un compte exposant » ouvre l'arrivée sans le prénom (lot 10a) : un seul
 *            formulaire pour les deux. La section s'affiche donc aussi sans enseigne.
 */
import { Check, CircleAlert, CirclePause, Clock, Plus, type LucideIcon } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { ProBadge } from '@/components/ui/ProBadge'
import { useAuth } from '@/lib/auth'
import { useTransitionNavigate } from '@/lib/navigation'
import { entityLine, type PaymentState } from '@/lib/settings'
import { openPortal } from '@/lib/stripe'
import { BillingRow } from './BillingRow'
import { DeleteEntityDialog } from './DeleteEntityDialog'
import { EntityBase } from './EntityBase'
import { SettingCard, SettingRow } from './SettingRow'
import { useUpcomingCounts } from './useUpcomingCounts'

/** La pastille de chaque état : blé quand c'est à toi de jouer, olive quand c'est réglé. */
const PAYMENT_CHIP: Record<PaymentState, { tone: ChipTone; Icon: LucideIcon }> = {
  paid: { tone: 'ok', Icon: Check },
  refused: { tone: 'todo', Icon: CircleAlert },
  trial: { tone: 'neutral', Icon: Clock },
  ending: { tone: 'neutral', Icon: Clock },
  suspended: { tone: 'todo', Icon: CirclePause },
}

export function EntitiesSection() {
  const { entities, switchActor } = useAuth()
  const go = useTransitionNavigate()
  const counts = useUpcomingCounts(entities.map((entity) => entity.actor_id))
  const [failed, setFailed] = useState(false)
  const [deleting, setDeleting] = useState<{
    id: string
    name: string
    subscribed: boolean
  } | null>(null)
  const now = new Date()

  return (
    <section className="settings-section">
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
            <Fragment key={entity.actor_id}>
              <SettingRow
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
                {line.status && <PaymentChip {...line.status} />}
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
                <button
                  type="button"
                  className="delete-account__open"
                  onClick={() => {
                    setDeleting({
                      id: entity.actor_id,
                      name: entity.brand_name,
                      subscribed: line.action === 'portal',
                    })
                  }}
                >
                  Supprimer…
                </button>
              </SettingRow>
              {line.action === 'portal' && (
                <BillingRow
                  entityId={entity.actor_id}
                  brandName={entity.brand_name}
                  billing={entity}
                />
              )}
              <EntityBase entityId={entity.actor_id} />
            </Fragment>
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
      {deleting && (
        <DeleteEntityDialog
          entityId={deleting.id}
          brandName={deleting.name}
          subscribed={deleting.subscribed}
          onClose={() => {
            setDeleting(null)
          }}
        />
      )}
    </section>
  )
}

function PaymentChip({ state, label }: { state: PaymentState; label: string }) {
  const { tone, Icon } = PAYMENT_CHIP[state]
  return (
    <Chip tone={tone} icon={<Icon size={12} strokeWidth={2.4} />}>
      {label}
    </Chip>
  )
}
