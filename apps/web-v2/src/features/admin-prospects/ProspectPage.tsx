/**
 * QUOI     — la page d'un prospect (`/admin/prospects/:id`) : son fil, la zone d'écriture, son
 *            suiveur, ses informations et sa note (maquettes 2355:2 et 2355:273).
 * POURQUOI — la prospection se fait dans Fellowship (Uriel, 16/10/2026) : chaque prospect a son fil.
 */
import { ChevronLeft } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { formatFullDate } from '@/lib/dates'
import { EMAIL_STATUSES } from '@/lib/prospect'
import { ComposeCard } from './ComposeCard'
import { OwnerMenu } from './OwnerMenu'
import { ProspectSideCards } from './ProspectSideCards'
import { updateProspect } from './prospect-writes'
import { ThreadCard } from './ThreadCard'
import { useProspect } from './useProspect'

export function ProspectPage() {
  const { id = '' } = useParams()
  const { person } = useAuth()
  const { data, error, reload } = useProspect(id)
  const [, setSearch] = useSearchParams()

  if (error) return <p className="admin-page__error">{error}</p>
  if (!data || !person) return null
  const { prospect, messages, senders } = data
  const me = person.actor_id

  const waiting = messages[messages.length - 1]?.direction === 'in'
  const status = prospect.unsubscribed_at
    ? { value: 'desinscrit', label: 'Désinscrit' }
    : waiting
      ? { value: 'a-repondre', label: 'À répondre' }
      : (EMAIL_STATUSES.find((s) => s.value === prospect.email_status) ?? {
          value: 'pas_envoye',
          label: 'Pas envoyé',
        })
  const meta = [
    prospect.brand,
    prospect.activity,
    prospect.city,
    `dans la liste depuis le ${formatFullDate(new Date(prospect.created_at))}`,
    prospect.source && `source : ${prospect.source}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="sheet">
      <Link to="/admin/prospects" className="sheet__back">
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
        Prospects
      </Link>
      <header className="sheet__head">
        <span className="prospect-page__initial" aria-hidden="true">
          {(prospect.name ?? prospect.brand ?? prospect.email ?? '?').charAt(0).toUpperCase()}
        </span>
        <div className="sheet__identity">
          <div className="sheet__name-line">
            <h1 className="sheet__name">
              {prospect.name ?? prospect.brand ?? prospect.email ?? 'Prospect sans nom'}
            </h1>
            <span
              className={`prospect-status prospect-status--${status.value.replace('_', '-')} prospect-page__status`}
            >
              {status.label}
            </span>
          </div>
          <p className="sheet__meta">{meta}</p>
        </div>
        <OwnerMenu
          prospectId={prospect.id}
          ownerId={prospect.owner_id}
          senders={senders}
          onChanged={reload}
        />
      </header>
      <div className="sheet__columns">
        <div className="sheet__column">
          <ThreadCard messages={messages} />
          <ComposeCard
            key={messages.length}
            sheet={data}
            me={me}
            onSent={() => {
              // La bienvenue est partie : on ne la repropose pas (`?modele=bienvenue`).
              setSearch(new URLSearchParams(), { replace: true })
              reload()
            }}
            onTakeOver={() =>
              void updateProspect(prospect.id, { owner_id: me }).then(reload, reload)
            }
          />
        </div>
        <div className="sheet__column sheet__column--side">
          <ProspectSideCards prospect={prospect} onChanged={reload} />
        </div>
      </div>
    </div>
  )
}
