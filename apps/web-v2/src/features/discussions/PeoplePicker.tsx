/**
 * QUOI     — choisir à qui écrire, parmi tes amis : les personnes choisies en pastilles, et une
 *            recherche par nom dans la liste.
 * POURQUOI — sert à « Nouveau message » et à « Ajouter » dans un groupe. Les messages sont réservés
 *            aux amis, des acteurs suivis dans les deux sens (la base le refuse sinon).
 */
import { useEffect, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import type { Person } from '@/lib/discussions'
import { fetchActorProfiles } from '@/lib/friends'
import { readFollows } from '@/lib/network'

interface Props {
  chosen: Person[]
  onChange: (next: Person[]) => void
  /** Déjà dans la conversation : on ne les propose pas. */
  exclude?: string[]
}

/** Sans majuscules ni accents : « eleonore » trouve « Éléonore ». */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

async function fetchFriends(actorId: string): Promise<Person[]> {
  const { following, followers } = await readFollows(actorId)
  const ids = followers.map((follower) => follower.id).filter((id) => following.has(id))
  const profiles = await fetchActorProfiles(ids)
  return ids.flatMap((id) => {
    const profile = profiles.get(id)
    return profile ? [{ id, label: profile.name, avatar: profile.avatarUrl }] : []
  })
}

export function PeoplePicker({ chosen, onChange, exclude = [] }: Props) {
  const { actor } = useAuth()
  const [words, setWords] = useState('')
  const [friends, setFriends] = useState<Person[] | 'failed' | null>(null)

  useEffect(() => {
    if (!actor) return
    let cancelled = false
    const run = async () => {
      let next: Person[] | 'failed'
      try {
        next = await fetchFriends(actor.id)
      } catch {
        next = 'failed'
      }
      if (!cancelled) setFriends(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [actor])

  const chosenIds = new Set(chosen.map((person) => person.id))
  const searched = fold(words.trim())
  const list = (Array.isArray(friends) ? friends : []).filter(
    (person) =>
      !exclude.includes(person.id) &&
      person.id !== actor?.id &&
      fold(person.label).includes(searched),
  )
  const toggle = (person: Person) =>
    onChange(
      chosenIds.has(person.id)
        ? chosen.filter((other) => other.id !== person.id)
        : [...chosen, person],
    )

  return (
    <div className="people-picker">
      <div className="people-picker__to">
        <span className="people-picker__label">À</span>
        {chosen.map((person) => (
          <button
            key={person.id}
            type="button"
            className="people-picker__chip"
            onClick={() => toggle(person)}
          >
            <Avatar
              className="people-picker__chip-avatar"
              src={person.avatar}
              name={person.label}
            />
            {person.label}
            <X size={12} strokeWidth={2.5} aria-label="Retirer" />
          </button>
        ))}
        <label className="people-picker__search">
          <Search size={15} strokeWidth={1.75} aria-hidden="true" />
          <input
            value={words}
            placeholder="Rechercher un ami"
            aria-label="Rechercher un ami"
            onChange={(event) => setWords(event.target.value)}
          />
        </label>
      </div>
      <p className="people-picker__section">Tes amis</p>
      {friends === 'failed' && (
        <p className="people-picker__empty">Tes amis ne se chargent pas. Recharge la page.</p>
      )}
      {Array.isArray(friends) && list.length === 0 && (
        <p className="people-picker__empty">
          {searched
            ? 'Aucun ami à ce nom.'
            : 'Pas encore d’ami ici. Suis quelqu’un : s’il te suit en retour, vous pourrez vous écrire.'}
        </p>
      )}
      <ul className="people-picker__list">
        {list.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              className="people-picker__person"
              aria-pressed={chosenIds.has(person.id)}
              onClick={() => toggle(person)}
            >
              <Avatar className="people-picker__avatar" src={person.avatar} name={person.label} />
              <span className="people-picker__name">{person.label}</span>
              <span className="people-picker__check" aria-hidden="true">
                {chosenIds.has(person.id) && <Check size={14} strokeWidth={3} />}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
