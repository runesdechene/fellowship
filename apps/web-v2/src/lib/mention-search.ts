/**
 * QUOI     — les exposants proposés quand on tape « @Nom » : la même recherche que la loupe, ses
 *            amis en tête.
 * POURQUOI — tout compte exposant se tague, les amis passent devant (Uriel, 18/11/2026).
 */
import { exhibitorsQuery } from './exhibitor-search'
import { searchPattern } from './explorer'
import type { Mention } from './mentions'

export interface MentionCandidate extends Mention {
  avatar: string | null
  city: string | null
  friend: boolean
}

const SHOWN = 5

export async function searchMentionCandidates(
  viewerId: string,
  query: string,
  friendIds: Set<string>,
): Promise<MentionCandidate[]> {
  const words = searchPattern(query)
  const { data, error } = await exhibitorsQuery(words, null, viewerId).order('brand_name').limit(30)
  if (error) throw new Error(error.message)
  return data
    .flatMap((row) =>
      row.actor_id && row.public_slug && row.brand_name
        ? [
            {
              id: row.actor_id,
              name: row.brand_name,
              slug: row.public_slug,
              avatar: row.avatar_url,
              city: row.city,
              friend: friendIds.has(row.actor_id),
            },
          ]
        : [],
    )
    .sort((a, b) => Number(b.friend) - Number(a.friend))
    .slice(0, SHOWN)
}
