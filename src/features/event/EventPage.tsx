import { ArrowLeft, CalendarDays, Clock, FileText, MapPin, Store, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { RichText } from '@/components/ui/RichText'
import { Tag } from '@/components/ui/Tag'
import { useAuth } from '@/lib/auth'
import { daysUntil, formatCountdown, formatDayMonth, formatFullDate } from '@/lib/dates'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import { useDeclarePageChrome } from '@/lib/page-chrome'
import { isRichTextEmpty } from '@/lib/rich-text'
import { tagStyleFor } from '@/lib/tags'
import { EventDiscussion } from './EventDiscussion'
import { EventStatus } from './EventStatus'
import { useEvent } from './useEvent'
import type { EventLedgerLine } from './useEvent'

/**
 * « Le » + « 13 juin », ou « Du » + « 13 au 14 juin ». Le mot d'attaque d'un
 * cote, les dates de l'autre : dans l'accroche, seules les dates portent le
 * gras — « Le » et « Du » ne sont pas des informations, c'est de la grammaire.
 */
function splitRange(start: Date, end: Date): [string, string] {
  if (start.getTime() === end.getTime()) return ['Le', formatDayMonth(start)]
  return ['Du', `${formatDayMonth(start)} au ${formatDayMonth(end)}`]
}

/** « Du 13 au 14 juin » — ou « Le 13 juin » quand la date tient sur un jour. */
function formatRange(start: Date, end: Date): string {
  if (start.getTime() === end.getTime()) return `Le ${formatDayMonth(start)}`
  return `Du ${formatDayMonth(start)} au ${formatDayMonth(end)}`
}

/**
 * Combien de jours dure la date. Posé SOUS ses bornes : un exposant compte en
 * jours de stand, pas en dates de calendrier — c'est ce nombre qui lui dit
 * s'il doit prévoir une nuit d'hôtel.
 */
function formatDuration(start: Date, end: Date): string | null {
  const jours = daysUntil(end, start) + 1
  if (jours <= 1) return null
  return `${jours} jours`
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
 * Une information pratique, en CARTE : l'icône à gauche, puis le libellé en
 * micro-capitales, la valeur en gras, et ce qui la précise en dessous.
 *
 * CE QUI N'EST PAS RENSEIGNÉ N'APPARAÎT PAS. La fiche a longtemps gardé la
 * place des absents, en éteint — ça se tenait tant que c'était une liste,
 * mais en cartes, quatre « Non renseigné » sur six font une grille de vide
 * qui pèse plus lourd que l'information. Le tri se fait à l'appel.
 */
type FactData = {
  Icon: LucideIcon
  label: string
  value: string | null | undefined
  /** Ce qui précise la valeur sans être elle : la durée, la salle, le mode. */
  sub?: string | null
}

function Fact({ Icon, label, value, sub }: FactData) {
  return (
    <div className="event-page__fact">
      <Icon className="event-page__fact-icon" size={20} strokeWidth={1.8} />
      <span className="event-page__fact-body">
        <span className="event-page__fact-label">{label}</span>
        <span className="event-page__fact-value">{value}</span>
        {sub && <span className="event-page__fact-sub">{sub}</span>}
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

  // La fiche est le seul écran à demander un décor à la coquille : l'affiche
  // remplit le mur de droite, le compte à rebours prend la barre du haut.
  // Déclaré AVANT tout retour anticipé — c'est un hook.
  useDeclarePageChrome({
    poster: event?.image_url ?? null,
    lead: startDate ? (past ? 'Date passée' : formatCountdown(daysAway)) : null,
  })

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

  // Les faits se construisent d'abord, se filtrent ensuite : seul ce que
  // l'organisateur a renseigné prend une carte.
  const facts: FactData[] = [
    {
      Icon: CalendarDays,
      label: 'Dates',
      value: formatRange(startDate, endDate),
      sub: formatDuration(startDate, endDate),
    },
    { Icon: Clock, label: 'Horaires', value: event.opening_hours },
    {
      Icon: MapPin,
      label: 'Lieu',
      value: `${event.city} (${event.department})`,
      sub: event.address,
    },
    { Icon: Users, label: 'Fréquentation', value: event.expected_attendance },
    {
      Icon: FileText,
      label: 'Candidater jusqu’au',
      value: event.registration_deadline
        ? formatFullDate(new Date(event.registration_deadline))
        : null,
      sub: event.registration_url ? 'En ligne' : event.contact_email ? 'Par e-mail' : null,
    },
    { Icon: Store, label: 'Emplacement', value: event.stand_price, sub: event.stand_size },
  ].filter((fait) => Boolean(fait.value))

  return (
    <div className="event-page">
      {back}

      <div className="event-page__main">
          <header className="event-page__hero">
            <div className="event-page__identity">
              <h1 className="event-page__title">{event.name}</h1>

              {/* Une seule phrase : ces trois faits se lisent d'un trait, ils
                  ne se scannent pas. Ceux qui se scannent sont plus bas, en
                  cartes. */}
              <p className="event-page__meta">
                {splitRange(startDate, endDate)[0]}{' '}
                <b>{splitRange(startDate, endDate)[1]}</b> — {event.city} (
                {event.department})
                {event.edition ? ` · ${event.edition}ᵉ édition` : ''}
              </p>

              {event.tags && event.tags.length > 0 && (
                <div className="event-page__tags">
                  {event.tags.map((tag) => (
                    <Tag key={tag} name={tag} style={tagStyleFor(tagStyles, tag)} />
                  ))}
                </div>
              )}

              {/* Une LIGNE, pas un bloc. Savoir qui d'autre y sera fait partie
                  de l'identité de la date, au même titre que son lieu — ça ne
                  méritait ni un titre de section ni une carte. */}
              {friends.length > 0 && (
                <p className="event-page__companions">
                  <span className="event-page__avatars">
                    {friends.slice(0, 5).map((friend) => (
                      <span key={friend.id} className="event-page__avatar">
                        <Avatar src={friend.avatarUrl} name={friend.name} />
                      </span>
                    ))}
                  </span>
                  {friends.length === 1 ? (
                    <span>
                      <b>{friends[0].name}</b> y sera aussi
                    </span>
                  ) : (
                    <span>
                      <b>{friends.length} exposants</b> que tu suis y seront
                    </span>
                  )}
                </p>
              )}
            </div>
          </header>

          <EventStatus
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

          {/* Sans cadre : un texte qu'on LIT n'a pas besoin d'être contenu.
              Le cadre disait « ceci est un bloc » alors que la description est
              simplement la voix de l'organisateur. Les cartes restent pour les
              FAITS — dates, lieu, échéance — qui eux se scannent. */}
          <Block title="À propos" bare empty={isRichTextEmpty(event.description)}>
            {isRichTextEmpty(event.description) ? (
              <p className="event-page__state">
                L’organisateur n’a pas encore décrit cet événement.
              </p>
            ) : (
              <RichText className="event-page__description" html={event.description ?? ''} />
            )}
          </Block>

          <Block title="Infos pratiques" bare empty={facts.length === 0}>
            {facts.length > 0 ? (
              <div className="event-page__facts">
                {facts.map((fait) => (
                  <Fact key={fait.label} {...fait} />
                ))}
              </div>
            ) : (
              <p className="event-page__state">
                L’organisateur n’a encore donné aucune information pratique.
              </p>
            )}

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

          <Block title="Discussion du festival" bare>
            <EventDiscussion eventId={event.id} />
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
    </div>
  )
}
