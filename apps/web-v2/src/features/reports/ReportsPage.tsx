/**
 * QUOI     — l'écran « Mes bilans » (/bilans?annee=2026) : la carte de l'année, le bénéfice par
 *            mois et la liste des dates.
 * POURQUOI — comparer ses saisons et retrouver chaque bilan. L'année vit dans l'adresse : le
 *            retour arrière du navigateur ramène à l'année d'avant.
 * ATTENTION — l'écran n'affiche que ce que useReports charge et lib/reports.ts calcule.
 */
import { Lock } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Segmented } from '@/components/ui/Segmented'
import { useAuth } from '@/lib/auth'
import { useDeclarePageChrome } from '@/lib/page-chrome'
import { yearSummary } from '@/lib/reports'
import { MonthlyChart } from './MonthlyChart'
import { ReportsTable } from './ReportsTable'
import { YearCard } from './YearCard'
import { useReports } from './useReports'

/** L'année de l'adresse, ou l'année en cours si elle manque ou ne veut rien dire. */
function yearFrom(raw: string | null): number {
  const year = Number(raw)
  return Number.isInteger(year) && year > 1900 ? year : new Date().getFullYear()
}

export function ReportsPage() {
  const { actor } = useAuth()
  const [params, setParams] = useSearchParams()
  const year = yearFrom(params.get('annee'))
  const { status, years, dates, previousYearRevenue } = useReports(actor?.id, year)
  useDeclarePageChrome({ poster: null, lead: null, back: '/' })

  // L'année affichée reste proposée même sans date, pour qu'on voie où l'on est.
  const choices = years.includes(year) ? years : [year, ...years].sort((a, b) => b - a)

  return (
    <div className="reports-page">
      <header className="reports-page__header">
        <div>
          <h1 className="reports-page__title">Mes bilans</h1>
          <p className="reports-page__private">
            <Lock size={13} strokeWidth={2} />
            Visibles par toi seul
            <span className="reports-page__private-more"> — aucun administrateur n’y a accès</span>
          </p>
        </div>
        {choices.length > 1 && (
          <Segmented
            label="Année"
            options={choices.map((value) => ({ value: String(value), label: String(value) }))}
            value={String(year)}
            onChange={(next) => {
              setParams({ annee: next }, { replace: true })
            }}
          />
        )}
      </header>

      {status === 'loading' && <p className="reports-page__note">Chargement de tes bilans…</p>}
      {status === 'error' && (
        <p className="reports-page__note">Tes bilans n’ont pas pu être chargés.</p>
      )}
      {status === 'ready' && dates.length === 0 && (
        <p className="reports-page__note">Aucune date en {year}.</p>
      )}
      {status === 'ready' && dates.length > 0 && (
        <ReportsContent
          summary={yearSummary(dates, previousYearRevenue)}
          dates={dates}
          year={year}
        />
      )}
    </div>
  )
}

function ReportsContent({
  summary,
  dates,
  year,
}: {
  summary: ReturnType<typeof yearSummary>
  dates: Parameters<typeof yearSummary>[0]
  year: number
}) {
  return (
    <>
      <YearCard summary={summary} year={year} />
      <section className="reports-page__section">
        <h2 className="reports-page__section-title">Bénéfice par mois</h2>
        <MonthlyChart months={summary.months} year={year} />
      </section>
      <section className="reports-page__section">
        <h2 className="reports-page__section-title">Les dates</h2>
        <ReportsTable dates={dates} bestId={summary.best?.eventId ?? null} />
      </section>
    </>
  )
}
