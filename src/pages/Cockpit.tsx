import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyParticipations } from '@/hooks/use-participations'
import { useMyReports } from '@/hooks/use-reports'
import { useMyLedger } from '@/hooks/use-ledger'
import {
  selectNextFestival, selectUpcomingFestivals, selectAReglerItems,
  aggregateSeason, detectBilanPrompt, selectRefusedDossiers,
} from '@/lib/cockpit'
import { todayKey, snoozedSetForDay, addSnooze, readSnoozeMap, writeSnoozeMap } from '@/lib/bilan-snooze'
import { BilanBanner } from '@/components/cockpit/BilanBanner'
import { DossiersRefuses } from '@/components/cockpit/DossiersRefuses'
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
  const { entriesByEvent, refetch: refetchLedger } = useMyLedger()
  // Un bilan compte comme « fait » (stoppe le nudge) seulement s'il a du contenu qualitatif
  // OU au moins une ligne MANUELLE — la seule ligne auto issue de la capture au stepper ne suffit pas.
  const reportedEventIds = useMemo(() => {
    const ids = new Set<string>()
    for (const [eventId, r] of reportsByEvent) {
      if ((r.note && r.note.trim()) || (r.improvements?.length) || (r.media_paths?.length)) ids.add(eventId)
    }
    for (const [eventId, list] of entriesByEvent) {
      if (list.some(e => e.source === 'manual')) ids.add(eventId)
    }
    return ids
  }, [reportsByEvent, entriesByEvent])

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
  const refused = useMemo(() => selectRefusedDossiers(participations), [participations])
  const bilanPrompt = useMemo(
    () => detectBilanPrompt(participations, reportedEventIds, now, snoozedToday),
    [participations, reportedEventIds, now, snoozedToday],
  )

  const name = currentActor?.label ?? ''
  const avatarUrl = currentActorRow?.avatar_url ?? null

  return (
    <div className="ck-page">
      <div className="ck-page-inner">
        <div className="ck-topbar">
          <div className="ck-avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials(name)}</span>}
          </div>
          <div>
            <h1 className="page-title">Bonjour {name}</h1>
            <p className="ck-sub">Ta prochaine action</p>
          </div>
        </div>

        {loading ? (
          <div className="ck-skel">{[0, 1, 2].map(i => <div key={i} className="ck-skel-col" />)}</div>
        ) : (
          <>
            <BilanBanner prompt={bilanPrompt} onSaved={() => { refetch(); refetchReports() }} onSnooze={onSnooze} />
            <div className="ck-hero">
              <ProchainFestival participation={nextFestival} />
              <SaisonFrise season={season} />
            </div>
            <ProchainsFestivals participations={upcoming} />
            <div className="ck-cols">
              <div className="ck-col"><AReglerFinaliser participations={aRegler} /></div>
              <div className="ck-col"><CompagnonsDeRoute /></div>
              <div className="ck-col"><MesBilans participations={participations} entriesByEvent={entriesByEvent} onSaved={() => { refetchReports(); refetchLedger() }} /></div>
            </div>
            <DossiersRefuses participations={refused} onUpdated={refetch} />
          </>
        )}
      </div>
    </div>
  )
}
