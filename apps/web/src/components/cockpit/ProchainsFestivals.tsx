import { Link } from 'react-router-dom'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
}

const STRIP_CAP = 4

/** Maps participationChip variant → status CSS variable */
function chipToStatusVar(variant: string): string {
  const map: Record<string, string> = {
    repere:  'var(--status-repere)',
    dossier: 'var(--status-dossier)',
    accepte: 'var(--status-accepte)',
    apayer:  'var(--status-apayer)',
    acompte: 'var(--status-acompte)',
    inscrit: 'var(--status-inscrit)',
    going:   'var(--status-inscrit)',
    refuse:  'var(--status-refuse)',
  }
  return map[variant] ?? 'hsl(var(--muted-foreground))'
}

export function ProchainsFestivals({ participations }: Props) {
  if (participations.length === 0) return null

  const now = new Date()
  const visible = participations.slice(0, STRIP_CAP)
  const extra = participations.length - visible.length

  return (
    <div className="ck-strip grain">
      <span className="ck-strip-lab">À VENIR</span>

      {visible.map((p, i) => {
        const ev = p.events
        const chip = participationChip(p.status, p.payment_status, 'entity')
        const dotColor = chip ? chipToStatusVar(chip.variant) : 'hsl(var(--muted-foreground))'
        const start = new Date(ev.start_date)
        const jMinus = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return (
          <span key={p.id} style={{ display: 'contents' }}>
            {i > 0 && <span className="sep" />}
            <Link to={`/calendrier`} className="ck-strip-it" style={{ textDecoration: 'none' }}>
              <span className="ck-dot" style={{ '--chip': dotColor } as React.CSSProperties} />
              {ev.name}
              <small>J-{jMinus}</small>
            </Link>
          </span>
        )
      })}

      {extra > 0 && (
        <>
          <span className="sep" />
          <Link
            to="/calendrier"
            style={{
              color: 'hsl(var(--muted-foreground))',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            +{extra} AUTRES ›
          </Link>
        </>
      )}
    </div>
  )
}
