import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { ReportReason, ReportStatus, ReportTargetType } from '@/lib/content-reports'

export interface ContentReport {
  id: string
  reporter_actor_id: string
  reporter_auth_id: string
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  comment: string | null
  status: ReportStatus
  admin_note: string | null
  resolved_at: string | null
  resolved_by_actor_id: string | null
  created_at: string
}

export interface CreateReportInput {
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  comment?: string
}

/** Crée un signalement. Retourne {ok:false, alreadyExists:true} si déjà un pending de ce user sur ce target. */
export async function createContentReport(
  input: CreateReportInput,
  opts: { actorId: string; authId: string }
): Promise<{ ok: true } | { ok: false; alreadyExists: boolean; error?: unknown }> {
  // Anti-doublon front : vérifie si l'user a déjà un report PENDING sur ce target
  const { data: existing } = await supabase
    .from('content_reports')
    .select('id')
    .eq('reporter_auth_id', opts.authId)
    .eq('target_type', input.targetType)
    .eq('target_id', input.targetId)
    .eq('status', 'pending')
    .maybeSingle()
  if (existing) return { ok: false, alreadyExists: true }

  const { error } = await supabase.from('content_reports').insert({
    reporter_actor_id: opts.actorId,
    reporter_auth_id: opts.authId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    comment: input.comment?.trim() || null,
  })
  if (error) return { ok: false, alreadyExists: false, error }
  return { ok: true }
}

/** Count des signalements PENDING. Admin only (RLS bloque les non-admin → renvoie 0). */
export function useAdminPendingReportsCount() {
  const { isAdmin } = useAuth()
  const [count, setCount] = useState(0)

  const refetch = useCallback(async () => {
    if (!isAdmin) { setCount(0); return }
    const { count: c } = await supabase
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    setCount(c ?? 0)
  }, [isAdmin])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { count, refetch }
}

export interface ContentReportEnriched extends ContentReport {
  reporter_label: string | null
  reporter_avatar_url: string | null
  target_label: string
  target_url: string
}

/** Liste des signalements pour l'admin, enrichis (reporter + target). */
export function useAdminReports(filter: ReportStatus | 'all' = 'pending') {
  const { isAdmin } = useAuth()
  const [reports, setReports] = useState<ContentReportEnriched[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!isAdmin) { setReports([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('content_reports').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data: rows } = await q
    const list = (rows ?? []) as ContentReport[]

    // Enrich reporters via actor_public
    const reporterIds = [...new Set(list.map(r => r.reporter_actor_id))]
    let reporters: Record<string, { label: string | null; avatar_url: string | null }> = {}
    if (reporterIds.length) {
      const { data } = await supabase.from('actor_public').select('actor_id, label, avatar_url').in('actor_id', reporterIds)
      reporters = Object.fromEntries(
        ((data ?? []) as Array<{ actor_id: string | null; label: string | null; avatar_url: string | null }>)
          .filter(a => a.actor_id != null)
          .map(a => [a.actor_id as string, { label: a.label, avatar_url: a.avatar_url }])
      )
    }

    // Enrich targets
    // - 'event' : lookup events (id)
    // - 'profile' : lookup entities (actor_id) — l'entité représente le compte exposant
    //   et porte la vitrine publique
    const eventIds = list.filter(r => r.target_type === 'event').map(r => r.target_id)
    const entityIds = list.filter(r => r.target_type === 'profile').map(r => r.target_id)
    let eventsMap: Record<string, { name: string }> = {}
    let entitiesMap: Record<string, { brand_name: string | null; public_slug: string | null }> = {}
    if (eventIds.length) {
      const { data } = await supabase.from('events').select('id, name').in('id', eventIds)
      eventsMap = Object.fromEntries(((data ?? []) as Array<{ id: string; name: string }>).map(e => [e.id, { name: e.name }]))
    }
    if (entityIds.length) {
      const { data } = await supabase.from('entities').select('actor_id, brand_name, public_slug').in('actor_id', entityIds)
      entitiesMap = Object.fromEntries(
        ((data ?? []) as Array<{ actor_id: string; brand_name: string | null; public_slug: string | null }>)
          .map(e => [e.actor_id, { brand_name: e.brand_name, public_slug: e.public_slug }])
      )
    }

    const enriched: ContentReportEnriched[] = list.map(r => {
      const rep = reporters[r.reporter_actor_id] ?? { label: null, avatar_url: null }
      const target = r.target_type === 'event'
        ? { label: eventsMap[r.target_id]?.name ?? '(événement supprimé)', url: `/evenement/${r.target_id}` }
        : (() => {
            const e = entitiesMap[r.target_id]
            return {
              label: e?.brand_name ?? '(profil supprimé)',
              url: e?.public_slug ? `/${e.public_slug}` : `/explorer`,
            }
          })()
      return { ...r, reporter_label: rep.label, reporter_avatar_url: rep.avatar_url, target_label: target.label, target_url: target.url }
    })

    setReports(enriched)
    setLoading(false)
  }, [filter, isAdmin])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { reports, loading, refetch }
}

/** Marque un signalement comme resolved ou dismissed, avec note admin optionnelle. */
export async function resolveReport(
  id: string,
  status: 'resolved' | 'dismissed',
  adminNote: string | undefined,
  adminActorId: string
): Promise<{ ok: boolean; error?: unknown }> {
  const { error } = await supabase
    .from('content_reports')
    .update({
      status,
      admin_note: adminNote?.trim() || null,
      resolved_at: new Date().toISOString(),
      resolved_by_actor_id: adminActorId,
    })
    .eq('id', id)
  return { ok: !error, error }
}
