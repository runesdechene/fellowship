/**
 * QUOI     — la section Enseignes et abonnement des Réglages : une carte par enseigne (maquette
 *            2589:233). En tête, son nom, son abonnement en une phrase, la pastille de son paiement
 *            (maquette 2558:233) et « Passer Pro » ; dessous, une ligne par sujet, chacune avec son
 *            icône : abonnement et paiement (si abonnée), facturation, siège, recettes et code de
 *            l'appareil (si Pro) ;
 *            en pied, Supprimer l'enseigne….
 * POURQUOI — lot 9b, maquette 2206:691 : chaque enseigne a sa vitrine et son propre abonnement.
 *            « Changer ma formule » et « Gérer » ouvrent l'espace Stripe, qui fait les deux ; « Passer
 *            Pro » fait de l'enseigne le compte actif, puis ouvre l'offre. Une ligne par sujet, au
 *            plus un bouton par ligne : les boutons s'empilaient sur la ligne de l'enseigne (Uriel,
 *            01/11/2026).
 * ATTENTION — « Créer un compte exposant » ouvre l'arrivée sans le prénom (lot 10a) : un seul
 *            formulaire pour les deux. La section s'affiche donc aussi sans enseigne.
 */
import {
  Check,
  CircleAlert,
  CirclePause,
  Clock,
  CreditCard,
  Plus,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { ProBadge } from '@/components/ui/ProBadge'
import { useAuth } from '@/lib/auth'
import { useTransitionNavigate } from '@/lib/navigation'
import { entityLine, type PaymentState } from '@/lib/settings'
import { subscriptionPrice } from '@/lib/pricing'
import { openPortal } from '@/lib/stripe'
import { BillingRow } from './BillingRow'
import { DeleteEntityDialog } from './DeleteEntityDialog'
import { DevicePinRow } from './DevicePinRow'
import { EntityBase } from './EntityBase'
import { RevenueKeyRow } from './RevenueKeyRow'
import { SettingCard, SettingRow } from './SettingRow'
import { useRevenueKeys } from './useRevenueKeys'
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
  const revenueKeys = useRevenueKeys(
    entities.filter((entity) => entityLine(entity, now, null).pro).map((entity) => entity.actor_id),
  )

  return (
    <section className="settings-section">
      <div className="settings-section__head">
        <h2 className="settings-section__title">Enseignes et abonnement</h2>
        <p className="settings-section__note">
          Chaque enseigne a sa vitrine et son propre abonnement.
        </p>
      </div>
      {entities.map((entity) => {
        const line = entityLine(entity, now, counts ? (counts.get(entity.actor_id) ?? 0) : null)
        const portal = () => {
          setFailed(false)
          openPortal(entity.actor_id).catch(() => {
            setFailed(true)
          })
        }
        return (
          <SettingCard key={entity.actor_id}>
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
            <div className="setting-card__group">
              {line.action === 'portal' && (
                <>
                  <SettingRow
                    className="setting-row--sub"
                    leading={<RefreshCw className="setting-row__icon" size={15} strokeWidth={2} />}
                    title="Abonnement"
                    note={subscriptionPrice(entity.billing_interval)}
                  >
                    <Button onClick={portal}>Changer ma formule</Button>
                  </SettingRow>
                  <SettingRow
                    className="setting-row--sub"
                    leading={<CreditCard className="setting-row__icon" size={15} strokeWidth={2} />}
                    title="Paiement et factures"
                    note="Ta carte et tes factures, dans l’espace sécurisé de Stripe."
                  >
                    <Button onClick={portal}>Gérer</Button>
                  </SettingRow>
                  <BillingRow
                    entityId={entity.actor_id}
                    brandName={entity.brand_name}
                    billing={entity}
                  />
                </>
              )}
              <EntityBase entityId={entity.actor_id} />
              {line.pro && revenueKeys.chosenAt && (
                <RevenueKeyRow
                  // Une phrase créée ou effacée remonte la ligne : elle réapparaît en fondu.
                  key={revenueKeys.chosenAt.get(entity.actor_id) ?? 'en-clair'}
                  entityId={entity.actor_id}
                  brandName={entity.brand_name}
                  chosenAt={revenueKeys.chosenAt.get(entity.actor_id) ?? null}
                  onChange={revenueKeys.reload}
                />
              )}
              {line.pro && revenueKeys.chosenAt?.get(entity.actor_id) && (
                <DevicePinRow entityId={entity.actor_id} />
              )}
            </div>
            <div className="setting-card__foot">
              <button
                type="button"
                className="setting-card__delete"
                onClick={() => {
                  setDeleting({
                    id: entity.actor_id,
                    name: entity.brand_name,
                    subscribed: line.action === 'portal',
                  })
                }}
              >
                Supprimer l’enseigne…
              </button>
            </div>
          </SettingCard>
        )
      })}
      <Link className="setting-create" to="/bienvenue?nouvelle-enseigne">
        <Plus size={14} strokeWidth={2} />
        Créer un compte exposant
      </Link>
      {failed && (
        <p className="settings-section__error">L’espace Stripe ne s’est pas ouvert. Réessaie.</p>
      )}
      {revenueKeys.failed && (
        <p className="settings-section__error">
          Tes phrases de passe n’ont pas pu être lues. Recharge la page.
        </p>
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
