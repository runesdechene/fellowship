import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyParticipations } from '@/hooks/use-participations'
import { useMyReports } from '@/hooks/use-reports'
import {
  selectNextFestival, selectUpcomingFestivals, selectAReglerItems,
  aggregateSeason, detectBilanPrompt,
} from '@/lib/cockpit'
import { todayKey, snoozedSetForDay, addSnooze, readSnoozeMap, writeSnoozeMap } from '@/lib/bilan-snooze'
import { BilanBanner } from '@/components/cockpit/BilanBanner'
import { ProchainFestival } from '@/components/cockpit/ProchainFestival'
import { ProchainsFestivals } from '@/components/cockpit/ProchainsFestivals'
import { AReglerFinaliser } from '@/components/cockpit/AReglerFinaliser'
import { CompagnonsDeRoute } from '@/components/cockpit/CompagnonsDeRoute'
import { SaisonFrise } from '@/components/cockpit/SaisonFrise'
import { MesBilans } from '@/components/cockpit/MesBilans'
import './Cockpit.css'

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function CockpitPage() {
  const { currentActor, currentActorRow } = useAuth()
  const { participations, loading, refetch } = useMyParticipations()
  const { reportsByEvent, refetch: refetchReports } = useMyReports()
  const reportedEventIds = useMemo(() => new Set(reportsByEvent.keys()), [reportsByEvent])

  const now = useMemo(() => new Date(), [])

  // Snooze « Plus tard » du bandeau bilan, persisté (#7) : filtre par event pour le jour courant.
  const [snoozeMap, setSnoozeMap] = useState<Record<string, string>>(() => readSnoozeMap())
  const snoozedToday = useMemo(() => snoozedSetForDay(snoozeMap, todayKey(now)), [snoozeMap, now])
  const onSnooze = (eventId: string) => {
    const next = addSnooze(snoozeMap, eventId, todayKey(now))
    writeSnoozeMap(next)
    setSnoozeMap(next)
  }

  const nextFestival = useMemo(() => selectNextFestival(participations, now), [participations, now])
  const upcoming = useMemo(() => selectUpcomingFestivals(participations, now), [participations, now])
  const aRegler = useMemo(() => selectAReglerItems(participations, now), [participations, now])
  const season = useMemo(() => aggregateSeason(participations, now), [participations, now])
  const bilanPrompt = useMemo(
    () => detectBilanPrompt(participations, reportedEventIds, now, snoozedToday),
    [participations, reportedEventIds, now, snoozedToday],
  )

  const name = currentActor?.label ?? ''
  const avatarUrl = currentActorRow?.avatar_url ?? null

  return (
    <div className="ck-page">
      <div className="ck-topbar">
        <div className="ck-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials(name)}</span>}
        </div>
        <div>
          <h1 className="page-title">Bonjour {name}</h1>
          <p className="ck-sub">La vision d'ensemble de ta saison</p>
        </div>
      </div>

      {loading ? (
        <div className="ck-skel">{[0, 1, 2].map(i => <div key={i} className="ck-skel-col" />)}</div>
      ) : (
        <>
          <BilanBanner prompt={bilanPrompt} onSaved={() => { refetch(); refetchReports() }} onSnooze={onSnooze} />
          <div className="ck-cols">
            <div className="ck-col">
              <ProchainFestival participation={nextFestival} />
              <ProchainsFestivals participations={upcoming} />
            </div>
            <div className="ck-col">
              <AReglerFinaliser participations={aRegler} />
              <CompagnonsDeRoute />
            </div>
            <div className="ck-col">
              <SaisonFrise season={season} />
              <MesBilans participations={participations} reportsByEvent={reportsByEvent} onSaved={refetchReports} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
