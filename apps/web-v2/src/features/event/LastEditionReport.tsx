/**
 * QUOI     — la carte « Ton bilan {année} » sous le statut de la fiche d'une nouvelle édition :
 *            bénéfice, chiffre d'affaires, frais, objectif, ce qui a marché, ce qui est à améliorer.
 * POURQUOI — maquette « Fiche · ton bilan de l'an passé » : savoir tout de suite si on y retourne.
 * ATTENTION — bilans = Pro : en gratuit, la carte passe sous le voile, sans le lien d'ouverture.
 */
import { ArrowRight } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import { ProVeil } from '@/components/ui/ProVeil'
import { formatDateRange } from '@/lib/dates'
import { formatEuros, formatSignedEuros, goalShare } from '@/lib/money'
import { useTransitionNavigate } from '@/lib/navigation'
import { usePlan } from '@/lib/usePlan'
import type { LastEditionReport as Report } from './useLastEditionReport'

function goalLabel(revenue: number, goal: number): string {
  const { percent } = goalShare(revenue, goal)
  return percent >= 100 ? `dépassé de ${String(percent - 100)} %` : `atteint à ${String(percent)} %`
}

function Tags({ label, tags }: { label: string; tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div className="last-edition__tags">
      <span className="last-edition__label">{label}</span>
      <span className="last-edition__list">
        {tags.map((tag) => (
          <span key={tag} className="tag-list__tag">
            {tag}
          </span>
        ))}
      </span>
    </div>
  )
}

function Content({ report }: { report: Report }) {
  return (
    <>
      <div className="last-edition__figures">
        <span className="last-edition__net">{formatSignedEuros(report.net)}</span>
        <span className="last-edition__figure">
          <span>Chiffre d’affaires</span>
          <b>{formatEuros(report.revenue)}</b>
        </span>
        <span className="last-edition__figure">
          <span>Frais</span>
          <b>{formatEuros(report.costs)}</b>
        </span>
        {report.revenueGoal !== null && report.revenueGoal > 0 && (
          <span className="last-edition__figure">
            <span>Objectif</span>
            <b>{goalLabel(report.revenue, report.revenueGoal)}</b>
          </span>
        )}
      </div>
      <Tags label="Ce qui a marché" tags={report.wins} />
      <Tags label="À améliorer" tags={report.improvements} />
    </>
  )
}

export function LastEditionReport({ report }: { report: Report }) {
  const { pro } = usePlan()
  const go = useTransitionNavigate()
  const year = report.startDate.getFullYear()

  return (
    <section className="last-edition">
      <div className="last-edition__head">
        <span className="last-edition__heading">
          <span className="last-edition__title">Ton bilan {year}</span>
          <span className="last-edition__meta">
            {report.name} · {formatDateRange(report.startDate, report.endDate, 'long')} {year}
          </span>
        </span>
        {pro && (
          <button
            type="button"
            className="last-edition__open"
            onClick={() => go(`/bilans/${report.eventId}`)}
          >
            Ouvrir le bilan
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        )}
      </div>
      {pro ? (
        <Content report={report} />
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
          <Content report={report} />
        </ProVeil>
      )}
    </section>
  )
}
