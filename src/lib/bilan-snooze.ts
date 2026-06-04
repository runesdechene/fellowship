// Snooze « Plus tard » du bandeau bilan (Cockpit, #7) : la fermeture doit PERSISTER
// (avant, c'était un state local remis à zéro au remount → le bandeau revenait).
// Granularité : par event ET par jour → un event snoozé réapparaît le lendemain.
// Logique pure (testable) séparée de l'I/O localStorage.

const STORAGE_KEY = 'bilan-snooze'

/** Clé de jour (UTC → déterministe, indépendant du fuseau) pour comparer les snoozes. */
export function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** Events encore snoozés pour le jour donné (les snoozes d'autres jours sont expirés). */
export function snoozedSetForDay(map: Record<string, string>, today: string): Set<string> {
  return new Set(Object.keys(map).filter(id => map[id] === today))
}

/** Ajoute un snooze pour aujourd'hui et purge les entrées périmées (bornage de la map). */
export function addSnooze(
  map: Record<string, string>,
  eventId: string,
  today: string,
): Record<string, string> {
  const fresh: Record<string, string> = {}
  for (const id of Object.keys(map)) {
    if (map[id] === today) fresh[id] = today
  }
  fresh[eventId] = today
  return fresh
}

// ---------- I/O localStorage (fin, non testé — miroir de Explorer readStored/persistFilters) ----------

export function readSnoozeMap(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return raw && typeof raw === 'object' ? raw as Record<string, string> : {}
  } catch {
    return {}
  }
}

export function writeSnoozeMap(map: Record<string, string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)) } catch { /* ignore */ }
}
