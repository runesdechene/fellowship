/**
 * QUOI     — le @ d'un champ de sujet : suit le nom qu'on tape, cherche les exposants, insère
 *            celui qu'on choisit et retient qui est tagué.
 * POURQUOI — trois champs taguent pareil (le mot d'un sujet, la réponse sous la story, le tchat) :
 *            un seul hook, branché par `onChange` et `onKeyDown`, la liste rendue par MentionList.
 * ATTENTION — `ids(text)` ne rend que les tagués dont le « @Nom » reste dans le texte ; la base
 *            refait la même vérification.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { useAuth } from '@/lib/auth'
import { fetchMutualFriendIds } from '@/lib/friends'
import { searchMentionCandidates, type MentionCandidate } from '@/lib/mention-search'
import { insertMention, keptMentions, mentionQuery, type Mention } from '@/lib/mentions'

type Field = HTMLTextAreaElement | HTMLInputElement

/** Le temps de finir une lettre avant de chercher. */
const PAUSE = 150

export function useMentions(
  field: RefObject<Field | null>,
  setText: (text: string) => void,
  initial: Mention[] = [],
) {
  const { actor } = useAuth()
  const [picked, setPicked] = useState<Mention[]>(initial)
  const [open, setOpen] = useState<{ start: number; query: string } | null>(null)
  const [candidates, setCandidates] = useState<MentionCandidate[]>([])
  const [active, setActive] = useState(0)
  const friends = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!actor) return
    fetchMutualFriendIds(actor.id)
      .then((ids) => (friends.current = new Set(ids)))
      // Sans la liste d'amis, la recherche marche quand même : seul l'ordre change.
      .catch(() => undefined)
  }, [actor])

  const query = open?.query ?? null
  useEffect(() => {
    if (!actor || query === null) return
    let cancelled = false
    const timer = setTimeout(() => {
      searchMentionCandidates(actor.id, query, friends.current)
        .then((found) => {
          if (cancelled) return
          setCandidates(found)
          setActive(0)
        })
        // Une recherche ratée ferme la liste, le texte reste tel quel.
        .catch(() => !cancelled && setCandidates([]))
    }, PAUSE)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [actor, query])

  function close() {
    setOpen(null)
    setCandidates([])
  }

  /** À appeler à chaque frappe, avec le texte et la position du curseur. */
  function track(text: string, caret: number | null) {
    const found = caret === null ? null : mentionQuery(text, caret)
    if (found) setOpen(found)
    else close()
  }

  function choose(candidate: MentionCandidate) {
    const input = field.current
    if (!input || !open) return
    const caret = input.selectionStart ?? input.value.length
    const next = insertMention(input.value, open.start, caret, candidate.name)
    setText(next.text)
    setPicked((current) => [...current, candidate])
    close()
    // Le texte change au rendu suivant : on y replace le curseur, après le nom.
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(next.caret, next.caret)
    })
  }

  /** Les flèches, Entrée et Tab choisissent dans la liste ouverte ; rend vrai si la touche a servi. */
  function keyDown(event: KeyboardEvent<Field>): boolean {
    if (!open || candidates.length === 0) return false
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key]
    if (step) {
      setActive((current) => (current + step + candidates.length) % candidates.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      const candidate = candidates[active]
      if (candidate) choose(candidate)
    } else if (event.key === 'Escape') {
      close()
    } else {
      return false
    }
    event.preventDefault()
    return true
  }

  return {
    track,
    keyDown,
    /** Les identifiants des tagués encore présents dans le texte. */
    ids: (text: string) => keptMentions(text, picked).map((mention) => mention.id),
    reset: () => {
      setPicked([])
      close()
    },
    list: { candidates: open ? candidates : [], active, onChoose: choose },
  }
}
