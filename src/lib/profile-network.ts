export type NetworkMember = {
  id: string
  display_name: string | null
  brand_name: string | null
  avatar_url: string | null
  public_slug: string | null
  craft_type: string | null
  city: string | null
  joinedAt: string
}

export function getRecentPreview(members: NetworkMember[], limit: number): NetworkMember[] {
  return [...members]
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    .slice(0, limit)
}

export function shouldShowFollowBack(
  memberId: string,
  friendIds: Set<string>,
  isOwner: boolean,
): boolean {
  return isOwner && !friendIds.has(memberId)
}
