/**
 * QUOI     — charge le bilan d'une date pour l'acteur actif : la date, la ligne event_reports si
 *            elle existe, les lignes de registre, l'objectif de chiffre d'affaires, les photos.
 * POURQUOI — l'écran du bilan lit tout d'un coup ; useReport le recharge après chaque écriture.
 * ATTENTION — rend null quand la date n'est pas un bilan possible (pas inscrit, ou date pas
 *            encore passée) : l'écran renvoie alors vers Mes bilans. Une erreur de la base, elle,
 *            LÈVE — jamais confondue avec « pas de bilan ».
 */
import { must, supabase } from '@/lib/supabase'
import { parseSqlDate, todayIso } from '@/lib/dates'
import { CONFIRMED_STATUSES } from '@/lib/friends'
import { signedReportUrls } from '@/lib/report-media'
import { CATEGORIES } from '@/lib/report-writes'
import type { ReportDate } from '@/lib/reports'
import type { LedgerCategory } from '@/types/database'

export interface ReportEntry {
  id: string
  amount: number
  direction: 'in' | 'out'
  category: LedgerCategory
  /** 'stepper' = le prix de la place, saisi dans Mon dossier. */
  source: 'manual' | 'stepper'
}

export interface ReportDetail {
  date: ReportDate
  /** null tant que rien n'a été saisi pour cette date. */
  reportId: string | null
  entries: ReportEntry[]
  wins: string[]
  improvements: string[]
  note: string
  photos: { path: string; url: string }[]
  revenueGoal: number | null
}

function toCategory(value: string): LedgerCategory {
  return CATEGORIES.find((entry) => entry.value === value)?.value ?? 'autre'
}

export async function loadReport(eventId: string, actorId: string): Promise<ReportDetail | null> {
  const participation = await supabase
    .from('participations')
    .select('event_id, events!inner(id, name, image_url, city, department, start_date, end_date)')
    .eq('actor_id', actorId)
    .eq('event_id', eventId)
    .in('status', CONFIRMED_STATUSES)
    .maybeSingle()
  const row = must(participation)
  if (!row || row.events.end_date >= todayIso()) return null
  const event = row.events

  const [reportResponse, ledgerResponse, dossierResponse] = await Promise.all([
    supabase
      .from('event_reports')
      .select('id, wins, improvements, note, media_paths')
      .eq('actor_id', actorId)
      .eq('event_id', eventId)
      .maybeSingle(),
    supabase
      .from('event_ledger_entries')
      .select('id, amount, direction, category, source')
      .eq('actor_id', actorId)
      .eq('event_id', eventId)
      .order('created_at'),
    supabase
      .from('participation_dossiers')
      .select('revenue_goal')
      .eq('actor_id', actorId)
      .eq('event_id', eventId)
      .maybeSingle(),
  ])
  const report = must(reportResponse)
  const ledger = must(ledgerResponse)
  const dossier = must(dossierResponse)

  const paths = report?.media_paths ?? []
  const urls = await signedReportUrls(paths)

  const entries = ledger.map<ReportEntry>((line) => ({
    id: line.id,
    amount: line.amount,
    direction: line.direction === 'in' ? 'in' : 'out',
    category: toCategory(line.category),
    source: line.source === 'stepper' ? 'stepper' : 'manual',
  }))

  return {
    date: {
      eventId: event.id,
      name: event.name,
      imageUrl: event.image_url,
      place: `${event.city} (${event.department})`,
      startDate: parseSqlDate(event.start_date),
      endDate: parseSqlDate(event.end_date),
      lines: entries,
    },
    reportId: report?.id ?? null,
    entries,
    wins: report?.wins ?? [],
    improvements: report?.improvements ?? [],
    note: report?.note ?? '',
    photos: paths.flatMap((path) => {
      const url = urls.get(path)
      return url ? [{ path, url }] : []
    }),
    revenueGoal: dossier?.revenue_goal ?? null,
  }
}
