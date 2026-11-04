/**
 * QUOI     — choisir à qui écrire : les personnes choisies en pastilles, une recherche par nom,
 *            et tes amis proposés d'abord.
 * POURQUOI — sert à « Nouveau message » et à « Ajouter » dans un groupe ; un ami est un acteur
 *            suivi dans les deux sens (lib/friends.ts).
 */
import { useEffect, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'
import { searchPeople } from '@/lib/discussion-api'
import type { Person } from '@/lib/discussions'
import { fetchActorProfiles } from '@/lib/friends'
import { readFollows } from '@/lib/network'

interface Props {
  chosen: Person[]
  onChange: (next: Person[]) => void
  /** Déjà dans la conversation : on ne les propose pas. */
  exclude?: string[]
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
  const [friends, setFriends] = useState<Person[]>([])
  const [found, setFound] = useState<Person[] | null>(null)

  useEffect(() => {
    if (!actor) return
    let cancelled = false
    const run = async () => {
      try {
        const list = await fetchFriends(actor.id)
        if (!cancelled) setFriends(list)
      } catch {
        // Sans la liste d'amis, la recherche par nom reste possible.
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [actor])

  // La recherche part un quart de seconde après la dernière lettre.
  useEffect(() => {
    if (!actor || words.trim().length < 2) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      const run = async () => {
        try {
          const list = await searchPeople(words, actor.id)
          if (!cancelled) setFound(list)
        } catch {
          if (!cancelled) setFound([])
        }
      }
      void run()
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [actor, words])

  const chosenIds = new Set(chosen.map((person) => person.id))
  const searching = words.trim().length >= 2
  const list = (searching ? (found ?? []) : friends).filter(
    (person) => !exclude.includes(person.id) && person.id !== actor?.id,
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
            placeholder="Rechercher une personne"
            aria-label="Rechercher une personne"
            onChange={(event) => setWords(event.target.value)}
          />
        </label>
      </div>
      <p className="people-picker__section">{searching ? 'Résultats' : 'Tes amis'}</p>
      {list.length === 0 && (
        <p className="people-picker__empty">
          {searching ? 'Personne à ce nom.' : 'Cherche un exposant ou un organisateur par son nom.'}
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
