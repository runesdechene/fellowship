export type ActorKind = 'person' | 'entity'
export type EntityType = 'exposant' | 'festival' | 'entreprise'
export type ActorAction = 'attend' | 'exhibit' | 'organize' | 'haveVitrine' | 'review'

/** Vue minimale d'un acteur pour la logique d'app (sur-ensemble = users/entities row). */
export interface ActorView {
  id: string
  kind: ActorKind
  entityType: EntityType | null
  label: string | null        // display_name (personne) ou brand_name (entité)
  hasName: boolean            // la personne a-t-elle renseigné son prénom ?
}

export const ENTITY_STORAGE_KEY = 'flwsh.currentActorId'

/** Nature de présence à un festival selon le type d'acteur (règle produit). */
export function presenceNature(a: ActorView): 'visitor' | 'exhibitor' | null {
  if (a.kind === 'person') return 'visitor'
  if (a.entityType === 'exposant' || a.entityType === 'entreprise') return 'exhibitor'
  return null // festival/orga : n'y va pas
}

export function actorCan(a: ActorView, action: ActorAction): boolean {
  switch (action) {
    case 'attend':      return presenceNature(a) !== null
    case 'exhibit':     return presenceNature(a) === 'exhibitor'
    case 'organize':    return a.kind === 'entity' && a.entityType === 'festival'
    case 'haveVitrine': return a.kind === 'entity'
    case 'review':      return presenceNature(a) === 'exhibitor'
  }
}

/** Acteur actif : entité stockée si valide, sinon la personne (mode festivalier). */
export function pickCurrentActor(person: ActorView, entities: ActorView[], storedId: string | null): ActorView {
  if (storedId) {
    const e = entities.find(x => x.id === storedId)
    if (e) return e
  }
  return person
}

export function deriveNeedsOnboarding(person: ActorView | null): boolean {
  return !person || !person.hasName
}

export function readStoredActorId(): string | null {
  try { return localStorage.getItem(ENTITY_STORAGE_KEY) } catch { return null }
}
export function writeStoredActorId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ENTITY_STORAGE_KEY, id)
    else localStorage.removeItem(ENTITY_STORAGE_KEY)
  } catch { /* ignore */ }
}
