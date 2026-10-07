/** Chemin relatif d'un événement : /e/{slug} si dispo, sinon fallback /evenement/{id}.
 *  Pour tous les liens internes (`<Link to>` / navigate). */
export function eventPath(event: { slug?: string | null; id: string }): string {
  return event.slug ? `/e/${event.slug}` : `/evenement/${event.id}`
}

/** Lien absolu partageable d'un événement : origin + eventPath. */
export function eventShareUrl(event: { slug?: string | null; id: string }, origin: string): string {
  return `${origin}${eventPath(event)}`
}
