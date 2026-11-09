/**
 * QUOI     — les journées de la décade choisie : ce que chaque source a donné, le total TTC, le HT
 *            et la TVA tels qu'envoyés à SuperPDP, et l'état du jour.
 *            Un jour se déplie sur ses ventes (`?jour=`).
 * POURQUOI — c'est ici qu'on vérifie un chiffre avant ou après son départ (maquette 2795:233).
 */
import { ChevronDown } from 'lucide-react'
import { Fragment } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatWeekdayDay, monthName, todayIso } from '@/lib/dates'
import { formatPrice } from '@/lib/money'
import {
  type Decade,
  dayState,
  decadeSpan,
  isLocked,
  type Sale,
  salesOf,
  sentAmounts,
  silentSources,
  sourceAmount,
  toDayStatus,
} from '@/lib/reporting'
import { HomeCard } from '@/features/admin-home/HomeCard'
import { DayMark } from './DayMark'
import { DaySales } from './DaySales'
import type { ReportingDay } from './useReporting'

const NONE = '—'

function sourceCell(row: ReportingDay | undefined, source: 'shopify' | 'sumup'): string {
  if (!row) return NONE
  if (silentSources(row.detail).includes(source === 'shopify' ? 'Shopify' : 'SumUp')) {
    return 'sans réponse'
  }
  const amount = sourceAmount(row.detail, source)
  return amount ? formatPrice(amount) : NONE
}

interface Props {
  decade: Decade
  byDay: ReadonlyMap<string, ReportingDay>
  today: Date
  onMarkSale: (dayId: string, sale: Sale, invoiced: boolean) => Promise<string | null>
}

export function DaysTable({ decade, byDay, today, onMarkSale }: Props) {
  const [search] = useSearchParams()
  const openDay = search.get('jour')

  /** L'adresse du tableau avec ce jour déplié, ou replié s'il l'est déjà. */
  function toggleLink(iso: string): string {
    const next = new URLSearchParams(search)
    if (iso === openDay) next.delete('jour')
    else next.set('jour', iso)
    return `?${next.toString()}`
  }

  return (
    <HomeCard title={`Les journées ${decadeSpan(decade)} ${monthName(decade.end)}`}>
      <table className="reporting-days">
        <thead>
          <tr>
            <th scope="col">Jour</th>
            <th scope="col">Shopify</th>
            <th scope="col">SumUp</th>
            <th scope="col">Total TTC</th>
            <th scope="col">HT</th>
            <th scope="col">TVA</th>
            <th scope="col">État</th>
          </tr>
        </thead>
        <tbody>
          {decade.days.map((day) => {
            const iso = todayIso(day)
            const row = byDay.get(iso)
            const status = row ? toDayStatus(row.statut) : null
            const amounts = row ? sentAmounts(row.lignes) : null
            const state = dayState(status, day, today)
            const shopify = sourceCell(row, 'shopify')
            const sumup = sourceCell(row, 'sumup')
            const sales = row ? salesOf(row.detail) : []
            const open = iso === openDay && sales.length > 0
            return (
              <Fragment key={day.getDate()}>
                <tr>
                  <th scope="row">
                    {sales.length > 0 ? (
                      <Link
                        className={open ? 'reporting-days__day is-open' : 'reporting-days__day'}
                        to={toggleLink(iso)}
                        aria-expanded={open}
                      >
                        {formatWeekdayDay(day)}
                        <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
                      </Link>
                    ) : (
                      formatWeekdayDay(day)
                    )}
                  </th>
                  <td className={shopify === NONE ? 'is-empty' : undefined}>{shopify}</td>
                  <td
                    className={sumup === NONE || sumup === 'sans réponse' ? 'is-empty' : undefined}
                  >
                    {sumup}
                  </td>
                  <td className={amounts ? 'reporting-days__total' : 'is-empty'}>
                    {amounts ? formatPrice(amounts.ht + amounts.tva) : NONE}
                  </td>
                  <td className={amounts ? undefined : 'is-empty'}>
                    {amounts ? formatPrice(amounts.ht) : NONE}
                  </td>
                  <td className={amounts ? undefined : 'is-empty'}>
                    {amounts ? formatPrice(amounts.tva) : NONE}
                  </td>
                  <td>
                    <span className={`reporting-days__state reporting-days__state--${state.mark}`}>
                      <DayMark mark={state.mark} size="s" />
                      {state.label}
                    </span>
                  </td>
                </tr>
                {open && row && (
                  <tr>
                    <td colSpan={7}>
                      <DaySales
                        sales={sales}
                        locked={isLocked(status)}
                        onMark={(sale, invoiced) => onMarkSale(row.id, sale, invoiced)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </HomeCard>
  )
}
