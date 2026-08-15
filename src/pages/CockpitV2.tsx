import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyParticipations } from '@/hooks/use-participations'
import { useMyReports } from '@/hooks/use-reports'
import { useMyLedger } from '@/hooks/use-ledger'
import { selectNextFestival, selectAReglerItems, aggregateSeason } from '@/lib/cockpit'
import { ProchainFestivalV2 } from '@/components/cockpit-v2/ProchainFestivalV2'
import { SaisonFriseV2 } from '@/components/cockpit-v2/SaisonFriseV2'
import { AReglerV2 } from '@/components/cockpit-v2/AReglerV2'
import { CompagnonsV2 } from '@/components/cockpit-v2/CompagnonsV2'
import { MesBilansV2 } from '@/components/cockpit-v2/MesBilansV2'
import './CockpitV2.css'

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function CockpitV2Page() {
  const { currentActor, currentActorRow } = useAuth()
  const { participations, loading } = useMyParticipations()
  const { refetch: refetchReports } = useMyReports()
  const { entriesByEvent, refetch: refetchLedger } = useMyLedger()

  const now = useMemo(() => new Date(), [])
  const nextFestival = useMemo(() => selectNextFestival(participations, now), [participations, now])
  const aRegler = useMemo(() => selectAReglerItems(participations, now), [participations, now])
  const season = useMemo(() => aggregateSeason(participations, now), [participations, now])

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
        <div className="ck2-grid-2">
          <ProchainFestivalV2 participation={nextFestival} />
          <SaisonFriseV2 season={season} />
        </div>

        <div className="ck2-grid-3">
          <AReglerV2 participations={aRegler} entriesByEvent={entriesByEvent} />
          <CompagnonsV2 />
          <MesBilansV2 participations={participations} entriesByEvent={entriesByEvent} onSaved={() => { refetchReports(); refetchLedger() }} />
        </div>
        </>
      )}
    </div>
  )
}
