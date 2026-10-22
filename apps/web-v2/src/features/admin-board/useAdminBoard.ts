/**
 * QUOI     — le tableau de l'équipe : les idées, le paquet de chaque admin, ce qui est terminé ;
 *            et les gestes (ajouter, terminer, repousser, mélanger, donner, supprimer).
 * POURQUOI — la table admin_tasks (admins seuls, RLS). Chaque geste recharge le tableau : l'équipe
 *            est petite, la lecture est courte, et l'écran montre toujours ce que dit la base.
 * ATTENTION — « Terminé » ne remonte que les 7 derniers jours : les lignes restent en base. Un
 *             admin lit toute la table users (politique users_select_self_or_admin).
 */
import { useCallback, useEffect, useState } from 'react'
import {
  doneSince,
  insertPosition,
  isTaskStatus,
  laterPosition,
  type TaskStatus,
} from '@/lib/admin-board'
import { useAuth } from '@/lib/auth'
import { must, supabase } from '@/lib/supabase'

export interface Admin {
  id: string
  name: string
  avatarUrl: string | null
}

export interface Task {
  id: string
  body: string
  status: TaskStatus
  ownerId: string | null
  position: number
  movedAt: string
}

interface Board {
  admins: Admin[]
  tasks: Task[]
}

async function loadBoard(): Promise<Board> {
  const since = doneSince(new Date()).toISOString()
  const [admins, tasks] = await Promise.all([
    supabase
      .from('users')
      .select('actor_id, display_name, avatar_url')
      .eq('role', 'admin')
      .order('display_name')
      .order('actor_id'),
    supabase
      .from('admin_tasks')
      .select('id, body, status, owner_user_id, position, moved_at')
      .or(`status.neq.done,moved_at.gte.${since}`)
      .order('position')
      .order('created_at')
      .order('id'),
  ])
  return {
    admins: must(admins).map((a) => ({
      id: a.actor_id,
      name: a.display_name ?? 'Admin',
      avatarUrl: a.avatar_url,
    })),
    tasks: must(tasks).flatMap((t) =>
      isTaskStatus(t.status)
        ? [
            {
              id: t.id,
              body: t.body,
              status: t.status,
              ownerId: t.owner_user_id,
              position: t.position,
              movedAt: t.moved_at,
            },
          ]
        : [],
    ),
  }
}

export function useAdminBoard() {
  const { person } = useAuth()
  const me = person?.actor_id ?? null
  const [state, setState] = useState<{ board: Board | null; error: string | null }>({
    board: null,
    error: null,
  })
  const [round, setRound] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const board = await loadBoard()
        if (cancelled) return
        setState({ board, error: null })
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

  const tasks = state.board?.tasks ?? []
  const deckOf = (ownerId: string | null) =>
    tasks.filter((t) => t.status === 'deck' && t.ownerId === ownerId)
  const positionsOf = (ownerId: string | null) => deckOf(ownerId).map((t) => t.position)

  const write = useCallback(async (job: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await job
    if (error) throw new Error(error.message)
    setRound((r) => r + 1)
  }, [])

  const update = (
    task: Task,
    changes: { status?: TaskStatus; owner_user_id?: string; position?: number },
  ) => write(supabase.from('admin_tasks').update(changes).eq('id', task.id))

  return {
    ...state,
    me,
    deckOf,
    addIdea: (body: string) =>
      write(supabase.from('admin_tasks').insert({ body: body.trim(), status: 'idea' })),
    addToDeck: (body: string, urgent: boolean) =>
      me
        ? write(
            supabase.from('admin_tasks').insert({
              body: body.trim(),
              status: 'deck',
              owner_user_id: me,
              position: insertPosition(positionsOf(me), urgent),
            }),
          )
        : Promise.reject(new Error('Session introuvable')),
    // Terminée par celui qui la tient.
    finish: (task: Task) => update(task, { status: 'done' }),
    later: (task: Task) => update(task, { position: laterPosition(positionsOf(task.ownerId)) }),
    toTop: (task: Task) =>
      update(task, { position: insertPosition(positionsOf(task.ownerId), true) }),
    // Une carte ou une idée posée sur un paquet tombe au hasard dedans.
    give: (task: Task, ownerId: string) =>
      update(task, {
        status: 'deck',
        owner_user_id: ownerId,
        position: insertPosition(positionsOf(ownerId), false),
      }),
    shuffle: () => write(supabase.rpc('admin_shuffle_deck')),
    remove: (task: Task) => write(supabase.from('admin_tasks').delete().eq('id', task.id)),
  }
}
