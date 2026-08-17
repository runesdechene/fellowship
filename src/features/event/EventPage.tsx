import { ArrowLeft, CheckCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { useAuth } from '@/lib/auth'
import { formatCountdown, formatDayMonth, formatFullDate } from '@/lib/dates'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import type { ParticipationStatus } from '@/types/database'
import { useEvent } from './useEvent'
import type { EventLedgerLine } from './useEvent'

/** Ce que chaque statut de dossier raconte, et avec quelle pastille. */
const STATUS: Record<ParticipationStatus, { label: string; tone: ChipTone }> = {
  inscrit: { label: 'Inscrit', tone: 'ok' },
  confirme: { label: 'Confirmé', tone: 'ok' },
  en_cours: { label: 'Dossier en cours', tone: 'pending' },
  interesse: { label: 'Intéressé', tone: 'neutral' },
  refuse: { label: 'Dossier refusé', tone: 'pending' },
}

/** Le paiement n'a que deux états vivants ; « acompte_verse » est un reliquat. */
const PAYMENT: Record<string, { label: string; tone: ChipTone }> = {
  a_payer: { label: 'Emplacement à payer', tone: 'pending' },
  acompte_verse: { label: 'Acompte versé', tone: 'pending' },
  paye: { label: 'Emplacement payé', tone: 'ok' },
}

/** « Du 13 au 14 juin » — ou « Le 13 juin » quand la date tient sur un jour. */
function formatRange(start: Date, end: Date): string {
  if (start.getTime() === end.getTime()) return `Le ${formatDayMonth(start)}`
  return `Du ${formatDayMonth(start)} au ${formatDayMonth(end)}`
}

/**
 * Une information pratique. Ce qui n'a pas été renseigné garde sa place, en
 * éteint : la fiche dit aussi ce que le festival n'a pas encore donné.
 */
function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="event-page__fact">
      <span className="event-page__fact-label">{label}</span>
      <span className={value ? 'event-page__fact-value' : 'event-page__fact-value--empty'}>
        {value || 'Non renseigné'}
      </span>
    </div>
  )
}

/** Une ligne du registre : son intitulé, puis son montant signé par le sens. */
function LedgerRow({ line }: { line: EventLedgerLine }) {
  const incoming = line.direction === 'in'
  return (
    <li className="event-page__ledger-row">
      <span className="event-page__ledger-label">{line.label || line.category}</span>
      <span
        className={
          incoming ? 'event-page__ledger-amount--in' : 'event-page__ledger-amount--out'
        }
      >
        {incoming ? formatEuros(line.amount) : `− ${formatEuros(line.amount)}`}
      </span>
    </li>
  )
}

export function EventPage() {
  const { id } = useParams<{ id: string }>()
  const { actor } = useAuth()
  const go = useTransitionNavigate()
  const {
    event,
    startDate,
    endDate,
    daysAway,
    past,
    status,
    paymentStatus,
    friends,
    ledger,
    revenue,
    net,
    loading,
    error,
  } = useEvent(id, actor?.id)

  // Pas le composant Button : ses variantes sont toutes des surfaces, et
  // celui-ci est un chemin de retour, pas une commande.
  const back = (
    <button type="button" className="event-page__back" onClick={() => go('/')}>
      <ArrowLeft size={15} strokeWidth={2} />
      Retour
    </button>
  )

  if (loading) {
    return (
      <div className="event-page">
        {back}
        <p className="event-page__state">Chargement de la fiche…</p>
      </div>
    )
  }

  if (error || !event || !startDate || !endDate) {
    return (
      <div className="event-page">
        {back}
        <p className="event-page__state">{error ?? 'Cet événement est introuvable.'}</p>
      </div>
    )
  }

  const payment = paymentStatus ? PAYMENT[paymentStatus] : null

  return (
    <div className="event-page">
      {back}

      <header className="event-page__hero">
        {event.image_url ? (
          <img className="event-page__poster" src={event.image_url} alt="" />
        ) : (
          <div className="event-page__poster" />
        )}

        <div className="event-page__identity">
          <h1 className="event-page__title">{event.name}</h1>
          <p className="event-page__meta">
            <b>{formatRange(startDate, endDate)}</b> · <b>{event.city}</b> ({event.department})
            {event.edition ? ` · ${event.edition}ᵉ édition` : ''}
          </p>

          <div className="event-page__chips">
            {!past && <Chip>{formatCountdown(daysAway)}</Chip>}
            {past && <Chip>Date passée</Chip>}
            {status ? (
              <Chip
                tone={STATUS[status].tone}
                icon={
                  STATUS[status].tone === 'ok' ? (
                    <CheckCheck size={11} strokeWidth={2.25} />
                  ) : undefined
                }
              >
                {STATUS[status].label}
              </Chip>
            ) : (
              <Chip>Tu n’es pas sur cette date</Chip>
            )}
            {payment && !past && <Chip tone={payment.tone}>{payment.label}</Chip>}
          </div>

          {event.tags && event.tags.length > 0 && (
            <div className="event-page__tags">
              {event.tags.map((tag, index) => (
                <span key={tag} className={index === 0 ? 'tag tag--first' : 'tag tag--on'}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="event-page__section">
        <h2 className="event-page__section-title">Le stand</h2>
        <div className="event-page__facts">
          <Fact label="Emplacement" value={event.stand_price} />
          <Fact label="Taille du stand" value={event.stand_size} />
          <Fact label="Horaires" value={event.opening_hours} />
          <Fact
            label="Date limite d’inscription"
            value={
              event.registration_deadline
                ? formatFullDate(new Date(event.registration_deadline))
                : null
            }
          />
          <Fact label="Fréquentation attendue" value={event.expected_attendance} />
          <Fact label="Adresse" value={event.address} />
        </div>

        {(event.registration_url || event.external_url || event.contact_email) && (
          <div className="event-page__links">
            {event.registration_url && (
              <a
                className="event-page__link"
                href={event.registration_url}
                target="_blank"
                rel="noreferrer"
              >
                Dossier d’inscription
              </a>
            )}
            {event.external_url && (
              <a
                className="event-page__link"
                href={event.external_url}
                target="_blank"
                rel="noreferrer"
              >
                Site du festival
              </a>
            )}
            {event.contact_email && (
              <a className="event-page__link" href={`mailto:${event.contact_email}`}>
                {event.contact_email}
              </a>
            )}
          </div>
        )}

        {event.registration_note && (
          <p className="event-page__note">{event.registration_note}</p>
        )}
      </section>

      {friends.length > 0 && (
        <section className="event-page__section">
          <h2 className="event-page__section-title">
            {friends.length === 1 ? 'Un ami y sera' : `${friends.length} amis y seront`}
          </h2>
          <div className="event-page__friends">
            {friends.map((friend) => (
              <span key={friend.id} className="event-page__friend">
                <Avatar src={friend.avatarUrl} name={friend.name} />
                <span className="event-page__friend-name">{friend.name}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {event.description && (
        <section className="event-page__section">
          <h2 className="event-page__section-title">Le festival</h2>
          <p className="event-page__description">{event.description}</p>
        </section>
      )}

      {past && (
        <section className="event-page__section">
          <div className="event-page__section-head">
            <h2 className="event-page__section-title">Le bilan</h2>
            {net !== null && revenue !== null && (
              <p className="event-page__section-total">
                <b>{formatSignedEuros(net)}</b> de bénéfice sur un CA de{' '}
                <b>{formatEuros(revenue)}</b>
              </p>
            )}
          </div>

          {ledger.length > 0 ? (
            <ul className="event-page__ledger">
              {ledger.map((line) => (
                <LedgerRow key={line.id} line={line} />
              ))}
            </ul>
          ) : (
            <p className="event-page__state">Le bilan de cette date n’a pas encore été rempli.</p>
          )}
        </section>
      )}
    </div>
  )
}
