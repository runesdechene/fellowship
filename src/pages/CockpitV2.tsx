import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyParticipations } from '@/hooks/use-participations'
import { useMyReports } from '@/hooks/use-reports'
import { useMyLedger } from '@/hooks/use-ledger'
import {
  selectNextFestival, selectAReglerItems, aggregateSeason,
  detectBilanPrompt, selectUpcomingFestivals, selectRefusedDossiers,
} from '@/lib/cockpit'
import { todayKey, snoozedSetForDay, addSnooze, readSnoozeMap, writeSnoozeMap } from '@/lib/bilan-snooze'
import { ProchainFestivalV2 } from '@/components/cockpit-v2/ProchainFestivalV2'
import { SaisonFriseV2 } from '@/components/cockpit-v2/SaisonFriseV2'
import { AReglerV2 } from '@/components/cockpit-v2/AReglerV2'
import { CompagnonsV2 } from '@/components/cockpit-v2/CompagnonsV2'
import { MesBilansV2 } from '@/components/cockpit-v2/MesBilansV2'
import { BilanLigneV2 } from '@/components/cockpit-v2/BilanLigneV2'
import { AVenirV2 } from '@/components/cockpit-v2/AVenirV2'
import { DossiersRefusesV2 } from '@/components/cockpit-v2/DossiersRefusesV2'
import './CockpitV2.css'

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function CockpitV2Page() {
  const { currentActor, currentActorRow } = useAuth()
  const { participations, loading, refetch } = useMyParticipations()
  const { reportsByEvent, refetch: refetchReports } = useMyReports()
  const { entriesByEvent, refetch: refetchLedger } = useMyLedger()

  // Un bilan compte comme « fait » (stoppe le nudge) seulement s'il a du contenu qualitatif
  // OU au moins une ligne MANUELLE — la seule ligne auto issue de la capture au stepper ne suffit pas.
  // Repris tel quel de Cockpit.tsx (V1).
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
  // Repris tel quel de Cockpit.tsx (V1).
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
    <div className="ck2">
      <div className="ck2-top">
        <span className="ck2-av">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials(name)}</span>}
        </span>
        <div>
          <h1 className="app2-title">Bonjour {name}</h1>
          <p className="app2-sub">Ta prochaine action</p>
        </div>
      </div>

      {loading ? (
        <div className="ck2-grid-2">
          <div className="ck2-block ck2-skel" /><div className="ck2-block ck2-skel" />
        </div>
      ) : (
        <>
        <BilanLigneV2 prompt={bilanPrompt} onSaved={() => { refetch(); refetchReports() }} onSnooze={onSnooze} />

        <div className="ck2-grid-2">
          <ProchainFestivalV2 participation={nextFestival} />
          <SaisonFriseV2 season={season} />
        </div>

        <AVenirV2 participations={upcoming} />

        <div className="ck2-grid-3">
          <AReglerV2 participations={aRegler} entriesByEvent={entriesByEvent} />
          <CompagnonsV2 />
          <MesBilansV2 participations={participations} entriesByEvent={entriesByEvent} onSaved={() => { refetchReports(); refetchLedger() }} />
        </div>

        <DossiersRefusesV2 participations={refused} onUpdated={refetch} />
        </>
      )}
    </div>
  )
}
