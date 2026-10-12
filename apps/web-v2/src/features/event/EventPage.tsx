/**
 * QUOI     — la fiche d'un événement (/evenement/:id) : titre, accroche, suivi, infos, discussion.
 * POURQUOI — l'écran où l'exposant décide et suit une date. Il déclare son décor au châssis
 *            (l'affiche pour le mur, le retour vers le tableau de bord, le compte à rebours) et
 *            délègue les données à useEvent.
 * ATTENTION — la description rich-text passe par RichText, donc par cleanRichText.
 */
import { ArrowRight, CalendarDays, Clock, MapPin, Pencil, Store, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RichText } from '@/components/ui/RichText'
import { Tag } from '@/components/ui/Tag'
import { useAuth } from '@/lib/auth'
import { durationLabel, formatCountdown, formatDateRange, formatDayMonth } from '@/lib/dates'
import { formatEuros, formatSignedEuros } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import { canEditEvent, type MissingField } from '@/lib/event-edit'
import { useDeclarePageChrome } from '@/lib/page-chrome'
import { isRichTextEmpty } from '@/lib/rich-text'
import { tagStyleFor } from '@/lib/tags'
import { Applying } from './Applying'
import { Companions } from './Companions'
import { EventMapPanel } from './EventMapPanel'
import { PlaceDistance } from './PlaceDistance'
import { useOrigin } from './useOrigin'
import { eventPoint } from '@/lib/distance'
import { AddMissing, KeptUpToDate } from './KeptUpToDate'
import { DiscussionBlock } from './DiscussionBlock'
import { LastEditionReport } from './LastEditionReport'
import { useLastEditionReport } from './useLastEditionReport'
import { EventReviews } from './EventReviews'
import { EventStatus } from './EventStatus'
import { MyDossier } from './MyDossier'
import { MyReportCard } from './MyReportCard'
import { useDossier } from './useDossier'
import { useEvent } from './useEvent'
import { canChangeStatus, monthsBeyond } from '@/lib/plan'
import { usePlan } from '@/lib/usePlan'
import { ProBadge } from '@/components/ui/ProBadge'
import { ProVeil } from '@/components/ui/ProVeil'

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
  /** Ce qui se pose sous la carte : la distance et « Voir sur la carte » pour le lieu. */
  extra?: ReactNode
}

function Fact({ Icon, label, value, sub, extra }: FactData) {
  return (
    <div className="event-page__fact">
      <Icon className="event-page__fact-icon" size={20} strokeWidth={1.8} />
      <span className="event-page__fact-body">
        <span className="event-page__fact-label">{label}</span>
        <span className="event-page__fact-value">{value}</span>
        {sub && <span className="event-page__fact-sub">{sub}</span>}
        {extra}
      </span>
    </div>
  )
}

export function EventPage() {
  const { id } = useParams<{ id: string }>()
  const { actor, person, entities } = useAuth()
  const { pro } = usePlan()
  const location = useLocation()
  const { hash } = location
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const { origin, askPosition, positionError, asking } = useOrigin()
  const go = useTransitionNavigate()
  const today = new Date()
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
  const lastEdition = useLastEditionReport(event?.previous_edition_id, actor?.id)
  const dossier = useDossier(id, actor?.id)

  // La fiche est le seul écran à demander un décor à la coquille : l'affiche
  // remplit le mur de droite, la flèche de retour et le compte à rebours
  // prennent le coin gauche de la barre du haut.
  // Déclaré AVANT tout retour anticipé — c'est un hook, et la flèche doit
  // exister même quand la fiche charge ou n'existe pas.
  useDeclarePageChrome({
    poster: event?.image_url ?? null,
    lead: startDate ? (past ? 'Date passée' : formatCountdown(daysAway)) : null,
    back: '/',
  })

  // Une notification mène à « #discussions » : le bloc n'existe qu'une fois la fiche chargée, et le
  // routeur ne descend pas seul vers une ancre.
  const loadedId = event?.id
  useEffect(() => {
    if (!loadedId || !hash) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loadedId, hash])

  // Le prix de la place est UNE ligne du registre — celle que le suivi pose —
  // et surtout pas la somme des lignes : additionner donnerait un total faux.
  const standAmount = ledger.find((line) => line.source === 'stepper')?.amount ?? 0

  if (loading) {
    return (
      <div className="event-page">
        <p className="event-page__state">Chargement de la fiche…</p>
      </div>
    )
  }

  if (error || !event || !startDate || !endDate) {
    return (
      <div className="event-page">
        <p className="event-page__state">{error ?? 'Cet événement est introuvable.'}</p>
      </div>
    )
  }

  // Les faits se construisent d'abord, se filtrent ensuite : seul ce que
  // l'organisateur a renseigné prend une carte.
  // La carte s'ouvre dans l'adresse (`?carte`) : le retour du navigateur la referme.
  const point = eventPoint(event)
  const closeMap = () => {
    if ((location.state as { carteOuverte?: boolean } | null)?.carteOuverte) void navigate(-1)
    else setSearch({}, { replace: true })
  }

  const facts: FactData[] = [
    {
      Icon: CalendarDays,
      label: 'Dates',
      value: formatRange(startDate, endDate),
      sub: durationLabel(startDate, endDate),
    },
    { Icon: Clock, label: 'Horaires', value: event.opening_hours },
    {
      Icon: MapPin,
      label: 'Lieu',
      value: `${event.city} (${event.department})`,
      sub: event.address,
      extra: (
        <PlaceDistance
          point={point}
          origin={origin}
          askPosition={askPosition}
          positionError={positionError}
          asking={asking}
          openMap={() => setSearch({ carte: '' }, { state: { carteOuverte: true } })}
        />
      ),
    },
    { Icon: Users, label: 'Fréquentation', value: event.expected_attendance },
    { Icon: Store, label: 'Emplacement', value: event.stand_price, sub: event.stand_size },
  ].filter((fait) => Boolean(fait.value))

  const myActorIds = [person?.actor_id, ...entities.map((entity) => entity.actor_id)].filter(
    (value): value is string => Boolean(value),
  )
  const canEdit = canEditEvent(event, myActorIds)
  const edit = (field?: MissingField) => {
    go(`/evenement/${event.id}/modifier${field ? `?champ=${field}` : ''}`)
  }

  return (
    <div className="event-page">
      {search.has('carte') && point && (
        <EventMapPanel
          name={event.name}
          point={point}
          place={[event.address, `${event.city} (${event.department})`].filter(Boolean).join(', ')}
          hasPoster={Boolean(event.image_url)}
          origin={origin}
          askPosition={askPosition}
          positionError={positionError}
          asking={asking}
          close={closeMap}
        />
      )}
      <div className="event-page__main">
        <header className="event-page__hero">
          {/* Sur téléphone, le mur d'affiche disparaît : l'affiche ouvre la fiche. */}
          {event.image_url && (
            <img className="event-page__mobile-poster" src={event.image_url} alt="" />
          )}
          <div className="event-page__identity">
            <div className="event-page__title-row">
              <h1 className="event-page__title">{event.name}</h1>
              {canEdit && (
                <button type="button" className="event-page__edit" onClick={() => edit()}>
                  <Pencil size={15} strokeWidth={2} />
                  Modifier la fiche
                </button>
              )}
            </div>

            {/* Une seule phrase : ces trois faits se lisent d'un trait, ils
                  ne se scannent pas. Ceux qui se scannent sont plus bas, en
                  cartes. */}
            <p className="event-page__meta">
              {formatDateRange(startDate, endDate, 'long')} {endDate.getFullYear()} · {event.city} (
              {event.department}) · {past ? 'date passée' : formatCountdown(daysAway).toLowerCase()}
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
            <Companions
              eventId={event.id}
              subtitle={`${event.name} · ${formatDateRange(startDate, endDate)}`}
              friends={friends}
            />
            <KeptUpToDate eventId={event.id} />
          </div>
        </header>

        <EventStatus
          status={status}
          setStatus={setStatus}
          saving={saving}
          writeError={writeError}
          locked={!canChangeStatus(startDate, status !== null, pro, today)}
          monthsAway={monthsBeyond(startDate, today)}
        />

        {lastEdition && <LastEditionReport report={lastEdition} />}

        {(status === 'inscrit' || status === 'confirme') && (
          <MyDossier
            paymentStatus={paymentStatus}
            orientation={paymentOrientation}
            standAmount={standAmount}
            saving={saving}
            setPayment={setPayment}
            setOrientation={setOrientation}
            setStandAmount={setStandAmount}
            fields={dossier.fields}
            save={dossier.save}
            error={dossier.error}
          />
        )}

        {/* Sans cadre : un texte qu'on LIT n'a pas besoin d'être contenu.
              Le cadre disait « ceci est un bloc » alors que la description est
              simplement la voix de l'organisateur. Les cartes restent pour les
              FAITS — dates, lieu, échéance — qui eux se scannent. */}
        <Block title="À propos" bare empty={isRichTextEmpty(event.description)}>
          {isRichTextEmpty(event.description) ? (
            <p className="event-page__state">
              L’organisateur n’a pas encore décrit cet événement.
              {canEdit && <AddMissing onClick={() => edit('description')} />}
            </p>
          ) : (
            <RichText className="event-page__description" html={event.description ?? ''} />
          )}
        </Block>

        <Block title="Informations" bare empty={facts.length === 0}>
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

          {event.external_url && (
            <div className="event-page__links">
              <a
                className="event-page__link"
                href={event.external_url}
                target="_blank"
                rel="noreferrer"
              >
                Site du festival
              </a>
            </div>
          )}
        </Block>

        <Applying
          event={event}
          status={status}
          setStatus={setStatus}
          statusSaving={saving}
          actorId={actor?.id}
          fields={dossier.fields}
          save={dossier.save}
          canEdit={canEdit}
          onAdd={edit}
        />

        <EventReviews
          eventId={event.id}
          viewerId={actor?.id}
          canReview={past && status === 'inscrit'}
        />

        <DiscussionBlock eventId={event.id} status={status} />

        {past && (
          <section className="event-page__block">
            <div className="event-page__block-head">
              <h2 className="event-page__block-title">Mon bilan</h2>
              {pro && net !== null && revenue !== null && (
                <p className="event-page__block-total">
                  <b>{formatSignedEuros(net)}</b> de bénéfice sur un CA de{' '}
                  <b>{formatEuros(revenue)}</b>
                </p>
              )}
            </div>
            {pro ? (
              <>
                <MyReportCard ledger={ledger} />
                <button
                  type="button"
                  className="event-page__link-button"
                  onClick={() => go(`/bilans/${event.id}`)}
                >
                  Ouvrir le bilan
                  <ArrowRight size={13} strokeWidth={2} />
                </button>
              </>
            ) : (
              <ProVeil
                invitation={
                  <button type="button" className="reports__invite" onClick={() => go('/bilans')}>
                    <ProBadge />
                    Tes bilans avec le Pro
                    <ArrowRight size={14} strokeWidth={2} />
                  </button>
                }
              >
                <MyReportCard ledger={ledger} />
              </ProVeil>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
