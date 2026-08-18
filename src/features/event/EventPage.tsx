import { ArrowLeft, CalendarDays, Clock, FileText, MapPin, Store, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { RichText } from '@/components/ui/RichText'
import { Tag } from '@/components/ui/Tag'
import { useAuth } from '@/lib/auth'
import { formatCountdown, formatDayMonth, formatFullDate } from '@/lib/dates'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import { isRichTextEmpty } from '@/lib/rich-text'
import { tagStyleFor } from '@/lib/tags'
import { EventCockpit } from './EventCockpit'
import { useEvent } from './useEvent'
import type { EventLedgerLine } from './useEvent'

/** « Du 13 au 14 juin » — ou « Le 13 juin » quand la date tient sur un jour. */
function formatRange(start: Date, end: Date): string {
  if (start.getTime() === end.getTime()) return `Le ${formatDayMonth(start)}`
  return `Du ${formatDayMonth(start)} au ${formatDayMonth(end)}`
}

/**
 * Un grand titre posé AU-DESSUS de son bloc, jamais dedans. Il pâlit quand le
 * bloc est vide : la page garde la même forme quel que soit le remplissage,
 * mais elle ne prétend pas que tout se vaut.
 */
function Block({
  title,
  empty,
  bare,
  children,
}: {
  title: string
  empty?: boolean
  /** Sans carte : le contenu se pose a meme le panneau (les infos pratiques). */
  bare?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="event-page__block">
      <h2 className={empty ? 'event-page__block-title--empty' : 'event-page__block-title'}>
        {title}
      </h2>
      {bare ? children : <div className="event-page__card">{children}</div>}
    </section>
  )
}

/**
 * Une information pratique. Ce qui n'a pas été renseigné garde sa place, en
 * éteint : la fiche dit aussi ce que le festival n'a pas encore donné.
 */
function Fact({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="event-page__fact">
      <span className="event-page__fact-label">
        <Icon size={13} strokeWidth={2} />
        {label}
      </span>
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
  const { actor, person } = useAuth()
  const go = useTransitionNavigate()
  const {
    event,
    startDate,
    endDate,
    daysAway,
    past,
    status,
    paymentStatus,
    paymentOrientation,
    friends,
    tagStyles,
    ledger,
    revenue,
    net,
    loading,
    error,
    setStatus,
    setPayment,
    setOrientation,
    setStandAmount,
    saving,
    writeError,
  } = useEvent(id, actor?.id, person?.actor_id)

  // Le prix de la place est UNE ligne du registre — celle que le suivi pose —
  // et surtout pas la somme des lignes : additionner donnerait un total faux.
  const standAmount = ledger.find((line) => line.source === 'stepper')?.amount ?? 0

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

  return (
    <div className="event-page">
      {back}

      <div className="event-page__cols">
        <div className="event-page__main">
          <header className="event-page__hero">
            {event.image_url ? (
              <img className="event-page__poster" src={event.image_url} alt="" />
            ) : (
              <div className="event-page__poster" />
            )}

            <div className="event-page__identity">
              <h1 className="event-page__title">{event.name}</h1>

              <div className="event-page__meta">
                <span className="event-page__meta-line">
                  <CalendarDays size={14} strokeWidth={1.8} />
                  <b>{formatRange(startDate, endDate)}</b>
                </span>
                <span className="event-page__meta-line">
                  <MapPin size={14} strokeWidth={1.8} />
                  {event.city} ({event.department})
                </span>
                {event.edition && (
                  <span className="event-page__meta-line">
                    <Store size={14} strokeWidth={1.8} />
                    {event.edition}ᵉ édition
                  </span>
                )}
              </div>

              <div className="event-page__chips">
                <Chip>{past ? 'Date passée' : formatCountdown(daysAway)}</Chip>
              </div>

              {event.tags && event.tags.length > 0 && (
                <div className="event-page__tags">
                  {event.tags.map((tag) => (
                    <Tag key={tag} name={tag} style={tagStyleFor(tagStyles, tag)} />
                  ))}
                </div>
              )}
            </div>
          </header>

          <Block title="Tes compagnons sur cette date" empty={friends.length === 0}>
            {friends.length > 0 ? (
              <div className="event-page__companions">
                <div className="event-page__avatars">
                  {friends.slice(0, 5).map((friend) => (
                    <span key={friend.id} className="event-page__avatar">
                      <Avatar src={friend.avatarUrl} name={friend.name} />
                    </span>
                  ))}
                </div>
                <span className="event-page__companions-text">
                  {friends.length === 1 ? (
                    <>
                      <b>{friends[0].name}</b> y sera
                    </>
                  ) : (
                    <>
                      <b>{friends.length} exposants</b> que tu suis y seront
                    </>
                  )}
                </span>
              </div>
            ) : (
              <p className="event-page__state">
                Personne de ton réseau n’est encore annoncé sur cette date.
              </p>
            )}
          </Block>

          <Block
            title="À propos"
            empty={isRichTextEmpty(event.description)}
          >
            {isRichTextEmpty(event.description) ? (
              <p className="event-page__state">
                L’organisateur n’a pas encore décrit cet événement.
              </p>
            ) : (
              <RichText className="event-page__description" html={event.description ?? ''} />
            )}
          </Block>

          <Block title="Infos pratiques" bare>
            <div className="event-page__facts">
              <Fact Icon={CalendarDays} label="Dates" value={formatRange(startDate, endDate)} />
              <Fact Icon={Clock} label="Horaires" value={event.opening_hours} />
              <Fact
                Icon={MapPin}
                label="Lieu"
                value={event.address || `${event.city} (${event.department})`}
              />
              <Fact
                Icon={Users}
                label="Fréquentation attendue"
                value={event.expected_attendance}
              />
              <Fact
                Icon={FileText}
                label="Candidatures jusqu’au"
                value={
                  event.registration_deadline
                    ? formatFullDate(new Date(event.registration_deadline))
                    : null
                }
              />
              <Fact
                Icon={Store}
                label={event.stand_size ? `Emplacement (${event.stand_size})` : 'Emplacement'}
                value={event.stand_price}
              />
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
          </Block>

          {past && (
            <section className="event-page__block">
              <div className="event-page__block-head">
                <h2 className="event-page__block-title">Mon bilan</h2>
                {net !== null && revenue !== null && (
                  <p className="event-page__block-total">
                    <b>{formatSignedEuros(net)}</b> de bénéfice sur un CA de{' '}
                    <b>{formatEuros(revenue)}</b>
                  </p>
                )}
              </div>
              <div className="event-page__card">
                {ledger.length > 0 ? (
                  <ul className="event-page__ledger">
                    {ledger.map((line) => (
                      <LedgerRow key={line.id} line={line} />
                    ))}
                  </ul>
                ) : (
                  <p className="event-page__state">
                    Le bilan de cette date n’a pas encore été rempli.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        <EventCockpit
          status={status}
          paymentStatus={paymentStatus}
          paymentOrientation={paymentOrientation}
          past={past}
          setStatus={setStatus}
          setPayment={setPayment}
          setOrientation={setOrientation}
          setStandAmount={setStandAmount}
          standAmount={standAmount}
          saving={saving}
          writeError={writeError}
        />
      </div>
    </div>
  )
}
