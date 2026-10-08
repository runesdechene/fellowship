/**
 * QUOI     — un exemple de bilans, flouté derrière l'invitation Pro quand l'enseigne n'en a pas.
 * POURQUOI — en gratuit, on devine ce que les bilans donneraient ; sans données à soi, on devine
 *            sur un exemple (maquette « Mes bilans · compte gratuit »). Jamais lisible : il est
 *            toujours sous le voile.
 */
import type { ReportDate } from '@/lib/reports'

function line(amount: number, direction: 'in' | 'out') {
  return { amount, direction, source: 'manual' }
}

export function sampleReports(year: number): ReportDate[] {
  const sample = (
    name: string,
    month: number,
    day: number,
    days: number,
    lines: ReturnType<typeof line>[],
  ) => ({
    eventId: `exemple-${name}`,
    name,
    imageUrl: null,
    place: '',
    startDate: new Date(year, month, day),
    endDate: new Date(year, month, day + days - 1),
    lines,
  })
  return [
    sample('Plane’R Fest', 6, 3, 3, [line(5802, 'in'), line(596, 'out')]),
    sample('Sylak', 7, 2, 2, [line(5400, 'in'), line(680, 'out')]),
    sample('Les Aventuriales', 5, 25, 3, [line(4210, 'in'), line(1340, 'out')]),
  ]
}
