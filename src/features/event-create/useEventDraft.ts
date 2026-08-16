import { useCallback, useEffect, useState } from 'react'

/**
 * Le brouillon d'un événement en cours de création.
 * L'affiche n'en fait PAS partie : un fichier ne se range pas dans le
 * stockage du navigateur, et on ne veut pas faire croire qu'il est conservé.
 */
export interface EventDraft {
  name: string
  isPrivate: boolean
  address: string
  city: string
  department: string
  startDate: string
  endDate: string
  /** L'ordre compte : la première catégorie est la principale. */
  tags: string[]
  description: string
  registrationDeadline: string
  registrationUrl: string
  externalUrl: string
  contactEmail: string
  registrationNote: string
}

export const EMPTY_DRAFT: EventDraft = {
  name: '',
  isPrivate: false,
  address: '',
  city: '',
  department: '',
  startDate: '',
  endDate: '',
  tags: [],
  description: '',
  registrationDeadline: '',
  registrationUrl: '',
  externalUrl: '',
  contactEmail: '',
  registrationNote: '',
}

const DRAFT_KEY = 'flwsh-event-draft'

function writeDraft(draft: EventDraft): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    return true
  } catch {
    /* stockage indisponible : le brouillon ne vaut que pour cette visite */
    return false
  }
}

function readDraft(): EventDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return EMPTY_DRAFT
    // Un brouillon écrit par une version antérieure peut manquer des champs :
    // on part toujours du gabarit vide et on écrase avec ce qu'on a.
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<EventDraft>) }
  } catch {
    return EMPTY_DRAFT
  }
}

/** Étapes du parcours, dans l'ordre. */
export const STEPS = ['L’événement', 'Où et quand', 'Catégories', 'Détails'] as const

/**
 * Ce qui manque pour passer à l'étape suivante. `null` = on peut avancer.
 * Reprend les règles de la V1 : un événement privé n'a pas besoin de
 * catégories, puisqu'il n'entre pas dans l'annuaire.
 */
export function blockingReason(draft: EventDraft, step: number): string | null {
  if (step === 0) {
    return draft.name.trim().length >= 3 ? null : 'Donne-lui un nom d’au moins trois lettres.'
  }
  if (step === 1) {
    if (!draft.city.trim()) return 'La ville est nécessaire.'
    if (!draft.department.trim()) return 'Le département est nécessaire.'
    if (!draft.startDate) return 'La date de début est nécessaire.'
    if (draft.endDate && draft.endDate < draft.startDate) {
      return 'La date de fin tombe avant le début.'
    }
    return null
  }
  if (step === 2) {
    if (draft.isPrivate) return null
    return draft.tags.length > 0 ? null : 'Choisis au moins une catégorie.'
  }
  return null
}

export function useEventDraft() {
  const [draft, setDraft] = useState<EventDraft>(readDraft)

  // Le brouillon survit à la fermeture de l'onglet : c'est la raison d'être
  // de cet écran plutôt qu'une modale.
  useEffect(() => {
    writeDraft(draft)
  }, [draft])

  /**
   * L'enregistrement volontaire. Le brouillon part déjà à chaque frappe ;
   * ce geste-là écrit pour de bon et dit si ça a tenu, parce qu'un bouton
   * qui affirme « sauvegardé » doit l'avoir vérifié.
   */
  const save = useCallback(() => writeDraft(draft), [draft])

  const update = useCallback(<K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }))
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setDraft((previous) => ({
      ...previous,
      tags: previous.tags.includes(tag)
        ? previous.tags.filter((existing) => existing !== tag)
        : [...previous.tags, tag],
    }))
  }, [])

  const clear = useCallback(() => {
    setDraft(EMPTY_DRAFT)
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* rien à nettoyer */
    }
  }, [])

  return { draft, update, toggleTag, clear, save }
}
