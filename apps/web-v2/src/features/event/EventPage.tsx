/**
 * QUOI     — la fiche d'un événement (/evenements/:slug) : titre, accroche, suivi, infos, discussion.
 * POURQUOI — l'écran où l'exposant décide et suit une date. Il déclare son décor au châssis
 *            (l'affiche pour le mur, le retour vers le tableau de bord, le compte à rebours) et
 *            délègue les données à useEvent.
 * ATTENTION — la description rich-text passe par RichText, donc par cleanRichText.
 */
import { ArrowRight, CalendarDays, Clock, Globe, Map as MapIcon, MapPin, Users } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { RichText } from '@/components/ui/RichText'
import { Tag } from '@/components/ui/Tag'
import { useAuth } from '@/lib/auth'
import { durationLabel, formatCountdown, formatDateRange, formatLongRange } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import { canEditEvent, type MissingField } from '@/lib/event-edit'
import { useDeclarePageChrome } from '@/lib/page-chrome'
import { isRichTextEmpty } from '@/lib/rich-text'
import { tagStyleFor } from '@/lib/tags'
import { ApplyDialog, ApplyFooter } from './Applying'
import { EventEssentials, type Essential } from './EventEssentials'
import { GuestGoing } from './GuestGoing'
import { websiteLink } from '@/lib/vitrine'
import { Companions } from './Companions'
import { EventMapPanel } from './EventMapPanel'
import { regionOf } from '@/lib/regions'
import { useOrigin } from './useOrigin'
import { eventPoint } from '@/lib/distance'
import { AddMissing, KeptUpToDate } from './KeptUpToDate'
import { DiscussionBlock } from './DiscussionBlock'
import { Breadcrumb } from './Breadcrumb'
import { ClaimBanner } from './ClaimBanner'
import { GuestPitch } from './GuestPitch'
import { GuestReviews } from './GuestReviews'
import { useFicheApercu } from './useFicheApercu'
import { MyReportBlock } from './MyReportBlock'
import { LastEditionReport } from './LastEditionReport'
import { useLastEditionReport } from './useLastEditionReport'
import { EventReviews } from './EventReviews'
import { EventStatus } from './EventStatus'
import { MyDossier } from './MyDossier'
import { useDossier } from './useDossier'
import { useEvent } from './useEvent'
import { canChangeStatus, monthsBeyond } from '@/lib/plan'
import { usePlan } from '@/lib/usePlan'
import { posterThumb } from '@/lib/poster-thumb'
import { eventPath } from '@/lib/event-path'
import { useEventKey } from './useEventKey'
import { useUrlFlag } from './useUrlFlag'

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

export function EventPage() {
  const { id, slug } = useEventKey()
  const { user, actor, person, entities } = useAuth()
  // Sans compte (lot 11b) : la fiche se lit, elle ne se pilote pas.
  const member = Boolean(user)
  const { pro } = usePlan()
  const { hash } = useLocation()
  const map = useUrlFlag('carte')
  const apply = useUrlFlag('candidater')
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
  const apercu = useFicheApercu(member ? null : (event?.id ?? null))

  // La fiche est le seul écran à demander un décor à la coquille : l'affiche
  // remplit le mur de droite, la flèche de retour et le compte à rebours
  // prennent le coin gauche de la barre du haut.
  const myActorIds = [person?.actor_id, ...entities.map((entity) => entity.actor_id)].filter(
    (value): value is string => Boolean(value),
  )
  const canEdit = event ? canEditEvent(event, myActorIds) : false

  // Déclaré AVANT tout retour anticipé — c'est un hook, et la flèche doit
  // exister même quand la fiche charge ou n'existe pas. « Modifier la fiche » monte dans la barre
  // du haut, à côté d'« Ajouter une date » (Uriel, 19/10/2026 : à côté du titre, il prenait trop
  // de place).
  useDeclarePageChrome({
    poster: event?.image_url ?? null,
    posterEvent: event?.id ?? null,
    posterTags: event?.tags ?? null,
    lead: startDate ? (past ? 'Date passée' : formatCountdown(daysAway)) : null,
    back: '/',
    edit: event && canEdit ? eventPath(slug, 'modifier') : null,
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
  const point = eventPoint(event)
  const site = event.external_url ? websiteLink(event.external_url) : null
  // Chaque fait une seule fois (maquette 2506:233) : ce que l'organisateur n'a pas renseigné n'a
  // pas de ligne.
  const essentials: Essential[] = [
    {
      Icon: CalendarDays,
      label: 'Quand',
      value: formatLongRange(startDate, endDate),
      sub: `${durationLabel(startDate, endDate)}, ${past ? 'date passée' : formatCountdown(daysAway).toLowerCase()}`,
    },
    { Icon: Clock, label: 'Horaires', value: event.opening_hours ?? '' },
    {
      Icon: MapPin,
      label: 'Où',
      value: [event.address, `${event.city} (${event.department})`].filter(Boolean).join(', '),
      sub: regionOf(event.department),
      action: point && (
        <button type="button" className="essentials__action" onClick={map.open}>
          Voir sur la carte
          <MapIcon size={13} strokeWidth={1.8} />
        </button>
      ),
    },
    { Icon: Users, label: 'Fréquentation', value: event.expected_attendance ?? '' },
    {
      Icon: Globe,
      label: 'Site',
      value: site?.label ?? '',
      action: site && (
        <a className="essentials__action" href={site.href} target="_blank" rel="noreferrer">
          Ouvrir
          <ArrowRight size={13} strokeWidth={2} />
        </a>
      ),
    },
  ].filter((fait) => Boolean(fait.value))

  const universe = event.tags?.[0] ?? null

  const facts = (
    <EventEssentials
      rows={essentials}
      footer={
        member ? (
          <ApplyFooter event={event} status={status} onApply={apply.open} canEdit={canEdit} />
        ) : (
          <ApplyFooter event={event} status={null} />
        )
      }
    />
  )

  const edit = (field?: MissingField) => {
    go(`${eventPath(slug, 'modifier')}${field ? `?champ=${field}` : ''}`)
  }

  // Sans cadre : un texte qu'on LIT n'a pas besoin d'être contenu. Les cartes restent pour les
  // FAITS — dates, lieu, échéance — qui eux se scannent.
  const about = (
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
  )

  return (
    <div className="event-page">
      {map.isOpen && point && (
        <EventMapPanel
          name={event.name}
          point={point}
          place={[event.address, `${event.city} (${event.department})`].filter(Boolean).join(', ')}
          hasPoster={Boolean(event.image_url)}
          origin={origin}
          askPosition={askPosition}
          positionError={positionError}
          asking={asking}
          close={map.close}
          personal={actor?.kind !== 'entity'}
        />
      )}
      <div className="event-page__main">
        <header className="event-page__hero">
          {/* Sur téléphone, le mur d'affiche disparaît : l'affiche ouvre la fiche. */}
          {event.image_url && (
            <img
              className="event-page__mobile-poster"
              src={posterThumb(event.image_url, 800, 80)}
              alt=""
            />
          )}
          {/* Le bilan de l'an passé, en haut à droite (maquette 2518:233). */}
          {lastEdition && (
            <div className="event-page__top">
              <LastEditionReport report={lastEdition} />
            </div>
          )}
          <div className="event-page__identity">
            {!member && (
              <Breadcrumb
                name={event.name}
                universe={universe ? (tagStyleFor(tagStyles, universe)?.label ?? universe) : null}
                department={event.department}
              />
            )}
            <h1 className="event-page__title">{event.name}</h1>

            {event.tags && event.tags.length > 0 && (
              <div className="event-page__tags">
                {event.tags.map((tag) => (
                  <Tag key={tag} name={tag} style={tagStyleFor(tagStyles, tag)} />
                ))}
              </div>
            )}

            {member && (
              <>
                <Companions
                  eventId={event.id}
                  subtitle={`${event.name} · ${formatDateRange(startDate, endDate)}`}
                  friends={friends}
                />
                <KeptUpToDate eventId={event.id} />
              </>
            )}
          </div>
        </header>

        {/* Le statut et le dossier se suivent de près : c'est le même suivi (maquette 2518:233). */}
        {member && (
          <div className="event-page__follow">
            <EventStatus
              status={status}
              setStatus={setStatus}
              saving={saving}
              writeError={writeError}
              locked={!canChangeStatus(startDate, status !== null, pro, today)}
              monthsAway={monthsBeyond(startDate, today)}
            />
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
          </div>
        )}

        {/* Connecté, l'à propos passe avant l'essentiel (maquette 2518:233) ; sans compte,
            l'essentiel d'abord (maquette 2506:233). */}
        {member ? (
          <>
            {about}
            {facts}
          </>
        ) : (
          <>
            {facts}
            {about}
          </>
        )}

        {member && (
          <ApplyDialog
            open={apply.isOpen}
            onClose={apply.close}
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
        )}

        {member ? (
          <>
            <EventReviews
              eventId={event.id}
              viewerId={actor?.id}
              canReview={past && status === 'inscrit'}
            />

            <DiscussionBlock eventId={event.id} status={status} />
          </>
        ) : (
          apercu && <GuestReviews apercu={apercu} />
        )}

        {past && member && (
          <MyReportBlock eventId={event.id} ledger={ledger} net={net} revenue={revenue} pro={pro} />
        )}
        <div className="event-page__closing">
          {!member && apercu && <GuestGoing going={apercu.going} faces={apercu.faces} />}
          {!canEdit && <ClaimBanner eventName={event.name} />}
        </div>
        {!member && <GuestPitch />}
      </div>
    </div>
  )
}
