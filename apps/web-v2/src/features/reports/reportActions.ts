/**
 * QUOI     — les écritures d'un bilan : lignes de montant, étiquettes, note, photos, effacement.
 * POURQUOI — chacune lève l'erreur de la base ; useReport l'attrape, l'affiche et recharge.
 * ATTENTION — le prix de la place (ligne « stepper ») ne s'écrit QUE par set_stand_amount : une
 *            seule source pour ce montant, partagée avec Mon dossier. Et « Supprimer ce bilan »
 *            ne supprime jamais la ligne event_reports (lib/report-writes.ts).
 */
import { must, supabase } from '@/lib/supabase'
import { removeReportPhotos, uploadReportPhoto } from '@/lib/report-media'
import { clearReportPlan, directionOf } from '@/lib/report-writes'
import type { LedgerCategory } from '@/types/database'
import type { ReportDetail, ReportEntry } from './loadReport'

interface Target {
  actorId: string
  eventId: string
  detail: ReportDetail
}

/** La ligne event_reports de la date, créée à la première saisie. */
async function ensureReport({ actorId, eventId, detail }: Target): Promise<string> {
  if (detail.reportId) return detail.reportId
  const inserted = await supabase
    .from('event_reports')
    .insert({ actor_id: actorId, event_id: eventId })
    .select('id')
    .maybeSingle()
  // Un autre onglet l'a créée entre-temps (unicité acteur + événement) : on reprend la sienne.
  if (inserted.error?.code !== '23505') {
    const row = must(inserted)
    if (row) return row.id
  }
  const existing = await supabase
    .from('event_reports')
    .select('id')
    .eq('actor_id', actorId)
    .eq('event_id', eventId)
    .maybeSingle()
  const row = must(existing)
  if (!row) throw new Error('Le bilan n’a pas pu être créé.')
  return row.id
}

async function setStand(target: Target, amount: number): Promise<void> {
  const { error } = await supabase.rpc('set_stand_amount', {
    p_actor_id: target.actorId,
    p_event_id: target.eventId,
    p_amount: amount,
  })
  if (error) throw new Error(error.message)
}

export async function addLine(target: Target, category: LedgerCategory, amount: number) {
  const reportId = await ensureReport(target)
  must(
    await supabase.from('event_ledger_entries').insert({
      report_id: reportId,
      actor_id: target.actorId,
      event_id: target.eventId,
      amount,
      direction: directionOf(category),
      category,
      source: 'manual',
      label: null,
    }),
  )
}

export async function setAmount(target: Target, entry: ReportEntry, amount: number) {
  if (entry.source === 'stepper') return setStand(target, amount)
  must(
    await supabase
      .from('event_ledger_entries')
      .update({ amount })
      .eq('id', entry.id)
      .eq('actor_id', target.actorId),
  )
}

export async function removeLine(target: Target, entry: ReportEntry) {
  if (entry.source === 'stepper') return setStand(target, 0)
  must(
    await supabase
      .from('event_ledger_entries')
      .delete()
      .eq('id', entry.id)
      .eq('actor_id', target.actorId),
  )
}

type ReportFields = { wins: string[] } | { improvements: string[] } | { note: string | null }

export async function updateReport(target: Target, fields: ReportFields) {
  const reportId = await ensureReport(target)
  must(
    await supabase
      .from('event_reports')
      .update(fields)
      .eq('id', reportId)
      .eq('actor_id', target.actorId),
  )
}

export async function addPhoto(target: Target, file: File) {
  const reportId = await ensureReport(target)
  const path = await uploadReportPhoto(file, target.actorId, target.eventId)
  const paths = [...target.detail.photos.map((photo) => photo.path), path]
  const saved = await supabase
    .from('event_reports')
    .update({ media_paths: paths })
    .eq('id', reportId)
    .eq('actor_id', target.actorId)
  // La photo est partie mais le bilan ne la connaît pas : on la retire, pour ne rien laisser traîner.
  if (saved.error) {
    await removeReportPhotos([path])
    throw new Error(saved.error.message)
  }
}

export async function removePhoto(target: Target, path: string) {
  if (!target.detail.reportId) return
  const paths = target.detail.photos.map((photo) => photo.path).filter((p) => p !== path)
  must(
    await supabase
      .from('event_reports')
      .update({ media_paths: paths })
      .eq('id', target.detail.reportId)
      .eq('actor_id', target.actorId),
  )
  await removeReportPhotos([path])
}

export async function clearReport(target: Target) {
  const { reportId } = target.detail
  if (!reportId) return
  const plan = clearReportPlan(reportId)
  must(
    await supabase
      .from('event_ledger_entries')
      .delete()
      .match(plan.deleteLines)
      .eq('actor_id', target.actorId),
  )
  must(
    await supabase
      .from('event_reports')
      .update(plan.resetReport)
      .eq('id', reportId)
      .eq('actor_id', target.actorId),
  )
  await removeReportPhotos(target.detail.photos.map((photo) => photo.path))
}
