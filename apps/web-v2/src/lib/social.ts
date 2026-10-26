/**
 * QUOI     — le réseau social d'une adresse (instagram.com → Instagram) et le lien à ouvrir pour
 *            un texte saisi (site, réseau).
 * POURQUOI — la fiche d'un prospect nomme ses réseaux au lieu de « Réseau social 1 », ses liens
 *            s'ouvrent, et la liste se filtre par réseau (Uriel, 26/10/2026).
 * ATTENTION — `host` est aussi la valeur du filtre `p_reseau` d'admin_prospects : la base cherche
 *            ce domaine dans les deux réseaux du prospect. Seul http(s) devient un lien.
 */

export const SOCIAL_NETWORKS = [
  { label: 'Instagram', host: 'instagram.com' },
  { label: 'Facebook', host: 'facebook.com' },
  { label: 'TikTok', host: 'tiktok.com' },
  { label: 'YouTube', host: 'youtube.com' },
  { label: 'Pinterest', host: 'pinterest.com' },
  { label: 'LinkedIn', host: 'linkedin.com' },
  { label: 'Etsy', host: 'etsy.com' },
] as const

/** Le lien à ouvrir ; une adresse sans protocole (instagram.com/x) en prend un. */
export function linkOf(text: string | null): string | null {
  const value = text?.trim() ?? ''
  if (/^https?:\/\/\S+$/i.test(value)) return value
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) return `https://${value}`
  return null
}

/** Le nom du réseau d'une adresse, ou null si on ne le reconnaît pas. */
export function networkOf(text: string | null): string | null {
  const link = linkOf(text)
  if (!link) return null
  const host = new URL(link).hostname.toLowerCase()
  const network = SOCIAL_NETWORKS.find((n) => host === n.host || host.endsWith(`.${n.host}`))
  return network?.label ?? null
}
