/**
 * QUOI     — les réponses de l'arrivée et l'étape où l'on est.
 * POURQUOI — lot 10a : un rechargement ne fait rien perdre. Les réponses vivent en mémoire de
 *            session, l'étape dans l'adresse (`?etape=N`), donc le retour du navigateur recule
 *            d'une étape.
 * ATTENTION — le code de parrainage se pré-remplit depuis `?r=`, puis depuis la clé que la V1 pose
 *            déjà (`flwsh.referralCode`, même origine).
 */
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EMPTY_DRAFT, welcomeSteps, type WelcomeDraft, type WelcomeKind } from '@/lib/welcome'

const DRAFT_KEY = 'flwsh-welcome'
export const REFERRAL_KEY = 'flwsh.referralCode'

function storedReferral(search: URLSearchParams): string {
  let code = search.get('r') ?? ''
  try {
    code ||= localStorage.getItem(REFERRAL_KEY) ?? ''
  } catch {
    /* stockage indisponible : pas de code pré-rempli */
  }
  return code.replace(/\s/g, '').toUpperCase()
}

function readDraft(search: URLSearchParams): WelcomeDraft {
  let saved: Partial<WelcomeDraft> = {}
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (raw) saved = JSON.parse(raw) as Partial<WelcomeDraft>
  } catch {
    /* brouillon illisible : on repart de zéro */
  }
  return { ...EMPTY_DRAFT, referral: storedReferral(search), ...saved }
}

export function clearWelcome() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
    localStorage.removeItem(REFERRAL_KEY)
  } catch {
    /* rien à effacer */
  }
}

export function useWelcomeDraft(kind: WelcomeKind) {
  const [search, setSearch] = useSearchParams()
  const [draft, setDraft] = useState<WelcomeDraft>(() => readDraft(search))
  const steps = welcomeSteps(kind)
  const asked = Number(search.get('etape') ?? '1')
  const index = Number.isInteger(asked) ? Math.min(Math.max(asked, 1), steps.length) - 1 : 0
  const step = steps[index] ?? steps[0] ?? 'brand'

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* stockage indisponible : le brouillon vit en mémoire seulement */
    }
  }, [draft])

  const set = useCallback((patch: Partial<WelcomeDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

  const goTo = useCallback(
    (at: number) => {
      const next = new URLSearchParams(search)
      next.set('etape', String(at + 1))
      setSearch(next)
    },
    [search, setSearch],
  )

  return {
    draft,
    set,
    steps,
    step,
    index,
    next: () => {
      goTo(Math.min(index + 1, steps.length - 1))
    },
    back: () => {
      goTo(Math.max(index - 1, 0))
    },
    goTo,
  }
}
