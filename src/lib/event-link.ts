/** Lien partageable d'un événement : /e/{slug} si dispo, sinon fallback /evenement/{id}. */
export function eventShareUrl(event: { slug: string | null; id: string }, origin: string): string {
  return event.slug ? `${origin}/e/${event.slug}` : `${origin}/evenement/${event.id}`
}
