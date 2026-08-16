import { useCallback, useEffect, useState } from 'react'
import { PartyPopper, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { DashboardReport } from './useDashboard'

const DISMISSED_KEY = 'flwsh-action-dismissed'

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

/**
 * La seule bande qui réclame quelque chose. Elle disparaît dès que le bilan
 * est rempli — ou que l'exposant l'a écartée.
 */
export function ActionBanner({ report }: { report: DashboardReport }) {
  const [dismissed, setDismissed] = useState<string[]>(readDismissed)

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
    } catch {
      /* stockage indisponible : le rejet ne vaut que pour cette session */
    }
  }, [dismissed])

  const dismiss = useCallback(() => {
    setDismissed((previous) =>
      previous.includes(report.eventId) ? previous : [...previous, report.eventId],
    )
  }, [report.eventId])

  if (dismissed.includes(report.eventId)) return null

  return (
    <div>
      <p className="action-banner__eyebrow">Ta prochaine action</p>

      <div className="action-banner">
        <span className="action-banner__icon">
          <PartyPopper size={20} strokeWidth={1.75} />
        </span>

        <div className="action-banner__body">
          <p className="action-banner__title">Comment s’est passé {report.name} ?</p>
          <p className="action-banner__note">
            Note tes revenus, tes coûts et tes impressions.
          </p>
        </div>

        <div className="action-banner__actions">
          <Button variant="action">Remplir mon bilan</Button>
          <Button onClick={dismiss}>Plus tard</Button>
          <Button variant="bare" onClick={dismiss} aria-label="Masquer">
            <X size={20} strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  )
}
