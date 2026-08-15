import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyParticipations } from '@/hooks/use-participations'
import { selectNextFestival, aggregateSeason } from '@/lib/cockpit'
import { ProchainFestivalV2 } from '@/components/cockpit-v2/ProchainFestivalV2'
import { SaisonFriseV2 } from '@/components/cockpit-v2/SaisonFriseV2'
import './CockpitV2.css'

function initials(label: string): string {
  return label.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

export function CockpitV2Page() {
  const { currentActor, currentActorRow } = useAuth()
  const { participations, loading } = useMyParticipations()

  const now = useMemo(() => new Date(), [])
  const nextFestival = useMemo(() => selectNextFestival(participations, now), [participations, now])
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
        <div className="ck2-grid-2">
          <ProchainFestivalV2 participation={nextFestival} />
          <SaisonFriseV2 season={season} />
        </div>
      )}
    </div>
  )
}
