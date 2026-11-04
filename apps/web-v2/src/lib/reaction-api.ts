/**
 * QUOI     — les réactions aux messages : les lire pour une conversation, réagir, et suivre
 *            celles des autres en direct.
 * POURQUOI — réagir comme sur WhatsApp (Uriel, 04/11/2026, maquette Story) ; un seul endroit
 *            parle à la base pour cela, au nom de l'acteur actif (la base vérifie can_act_as).
 * ATTENTION — retirer une réaction met `emoji` à nul au lieu d'effacer la ligne : le temps réel ne
 *            filtre pas un effacement par conversation (migration 20261104150000).
 */
import { must, supabase } from './supabase'
import type { Reaction } from './discussions'
import type { Database } from '@/types/supabase'

type ReactionRow = Database['public']['Tables']['message_reactions']['Row']

function toReaction(row: Pick<ReactionRow, 'message_id' | 'actor_id' | 'emoji'>): Reaction {
  return { messageId: row.message_id, actorId: row.actor_id, emoji: row.emoji }
}

export async function fetchReactions(conversationId: string): Promise<Reaction[]> {
  const rows = must(
    await supabase
      .from('message_reactions')
      .select('message_id, actor_id, emoji')
      .eq('conversation_id', conversationId)
      .not('emoji', 'is', null),
  )
  return rows.map(toReaction)
}

/** Réagit au message ; sans emoji, retire la réaction. */
export async function reactToMessage(
  actorId: string,
  messageId: string,
  emoji: string | null,
): Promise<void> {
  must(
    await supabase.rpc('reagir_message', {
      p_actor: actorId,
      p_message: messageId,
      ...(emoji ? { p_emoji: emoji } : {}),
    }),
  )
}

/** Chaque réaction posée, changée ou retirée dans la conversation ; rend de quoi se désabonner. */
export function watchReactions(conversationId: string, onReaction: (reaction: Reaction) => void) {
  const channel = supabase
    .channel(`reactions:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        // Un effacement n'arrive jamais ici : la base ne retire une réaction qu'en vidant l'emoji.
        if (payload.eventType !== 'DELETE') onReaction(toReaction(payload.new as ReactionRow))
      },
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
