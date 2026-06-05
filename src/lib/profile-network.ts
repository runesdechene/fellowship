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

export const AVATAR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ['#f0a060', '#e74c3c'],
  ['#6c5ce7', '#a29bfe'],
  ['#00b894', '#00cec9'],
  ['#fd79a8', '#e84393'],
  ['#f39c12', '#d68910'],
]

export function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

export type NetworkListItemDisplay = {
  name: string
  target: string
  avatarUrl: string | null
  fallbackInitial: string
  gradientFrom: string
  gradientTo: string
  craftType: string | null
}

export function networkListItemDisplay(member: NetworkMember): NetworkListItemDisplay {
  const name = member.brand_name ?? member.display_name ?? 'Utilisateur'
  const [gradientFrom, gradientTo] = AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
  return {
    name,
    target: `/@${member.public_slug ?? member.id}`,
    avatarUrl: member.avatar_url,
    fallbackInitial: name[0]?.toUpperCase() ?? '?',
    gradientFrom,
    gradientTo,
    craftType: member.craft_type,
  }
}
