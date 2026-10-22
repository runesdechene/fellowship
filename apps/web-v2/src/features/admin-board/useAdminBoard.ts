/**
 * QUOI     — les cartes du tableau de l'équipe : les lire, en ajouter, les déplacer, les corriger,
 *            les prendre ou les lâcher, les supprimer.
 * POURQUOI — la table admin_tasks (admins seuls, RLS) ; chaque écriture recharge le tableau, pour
 *            voir aussi ce que le déclencheur a fait (l'ancienne carte « Maintenant » renvoyée).
 * ATTENTION — « Fait » ne remonte que les 7 derniers jours : les lignes restent en base. Le nom
 *             d'un porteur se lit dans actor_public (users ne se lit que sur sa propre ligne).
 */
import { useCallback, useEffect, useState } from 'react'
import { doneSince, isTaskStatus, type TaskStatus } from '@/lib/admin-board'
import { useAuth } from '@/lib/auth'
import { must, supabase } from '@/lib/supabase'

export interface Task {
  id: string
  body: string
  status: TaskStatus
  movedAt: string
  ownerId: string | null
  owner: { name: string | null; avatarUrl: string | null } | null
}

async function loadTasks(): Promise<Task[]> {
  const since = doneSince(new Date()).toISOString()
  const rows = must(
    await supabase
      .from('admin_tasks')
      .select('id, body, status, moved_at, owner_user_id')
      .or(`status.neq.done,moved_at.gte.${since}`)
      .order('moved_at')
      .order('id'),
  )
  const ownerIds = [...new Set(rows.flatMap((r) => (r.owner_user_id ? [r.owner_user_id] : [])))]
  const owners = ownerIds.length
    ? must(
        await supabase
          .from('actor_public')
          .select('actor_id, label, avatar_url')
          .in('actor_id', ownerIds),
      )
    : []
  const people = new Map(
    owners.flatMap((o) =>
      o.actor_id ? [[o.actor_id, { name: o.label, avatarUrl: o.avatar_url }]] : [],
    ),
  )
  return rows.flatMap((r) =>
    isTaskStatus(r.status)
      ? [
          {
            id: r.id,
            body: r.body,
            status: r.status,
            movedAt: r.moved_at,
            ownerId: r.owner_user_id,
            owner: r.owner_user_id ? (people.get(r.owner_user_id) ?? null) : null,
          },
        ]
      : [],
  )
}

export function useAdminBoard() {
  const { person } = useAuth()
  const me = person?.actor_id ?? null
  const [state, setState] = useState<{ tasks: Task[] | null; error: string | null }>({
    tasks: null,
    error: null,
  })
  const [round, setRound] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const tasks = await loadTasks()
        if (cancelled) return
        setState({ tasks, error: null })
      } catch (error) {
        if (cancelled) return
        setState((s) => ({
          ...s,
          error: error instanceof Error ? error.message : 'Chargement impossible',
        }))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [round])

  const write = useCallback(async (job: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await job
    if (error) throw new Error(error.message)
    setRound((r) => r + 1)
  }, [])

  return {
    ...state,
    me,
    add: (body: string, status: TaskStatus) =>
      write(supabase.from('admin_tasks').insert({ body: body.trim(), status })),
    // « Maintenant » a toujours un porteur : celui qui y pose une carte orpheline la prend.
    move: (task: Task, status: TaskStatus) =>
      write(
        supabase
          .from('admin_tasks')
          .update({ status, owner_user_id: status === 'now' ? (task.ownerId ?? me) : task.ownerId })
          .eq('id', task.id),
      ),
    rename: (task: Task, body: string) =>
      write(supabase.from('admin_tasks').update({ body: body.trim() }).eq('id', task.id)),
    // Prendre une carte, ou la lâcher si elle est déjà à soi.
    take: (task: Task) =>
      write(
        supabase
          .from('admin_tasks')
          .update({ owner_user_id: task.ownerId === me ? null : me })
          .eq('id', task.id),
      ),
    remove: (task: Task) => write(supabase.from('admin_tasks').delete().eq('id', task.id)),
  }
}
