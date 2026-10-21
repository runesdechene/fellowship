/**
 * QUOI     — « Tu les connais peut-être » : jusqu'à douze exposants des mêmes festivals, puis du
 *            même métier, de la même région, et à défaut les nouveaux venus, à suivre d'un clic.
 * POURQUOI — spec du 21/10/2026, maquette 2392:65 : l'enseigne qui arrive repart reliée. Le suivi
 *            part au clic, comme dans la Communauté, et revient en arrière si l'écriture échoue.
 * ATTENTION — une liste vide n'affiche rien ; une lecture ratée le dit, sans passer pour une liste
 *            vide. Le bouton du formulaire mène à la suite dans tous les cas.
 */
import { useEffect, useState } from 'react'
import { PersonCard } from '@/components/ui/PersonCard'
import { must, supabase } from '@/lib/supabase'
import { exhibitorReason } from '@/lib/welcome'
import { useToggles } from './useToggles'

interface Suggested {
  id: string
  name: string
  avatarUrl: string | null
  city: string | null
  reason: string
}

async function loadPeople(actorId: string): Promise<Suggested[]> {
  const rows = must(await supabase.rpc('welcome_exhibitors', { p_actor: actorId }))
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar,
    city: row.city,
    reason: exhibitorReason(row.reason, row.shared),
  }))
}

async function follow(actorId: string, id: string, following: boolean): Promise<boolean> {
  const { error } = following
    ? await supabase.from('follows').insert({ follower_actor: actorId, following_actor: id })
    : await supabase
        .from('follows')
        .delete()
        .eq('follower_actor', actorId)
        .eq('following_actor', id)
  return error === null
}

export function WelcomePeople({ actorId }: { actorId: string }) {
  const [people, setPeople] = useState<Suggested[] | null>(null)
  const [failed, setFailed] = useState(false)
  const { on, pending, toggle } = useToggles((id, value) => follow(actorId, id, value))

  useEffect(() => {
    let cancelled = false
    async function load() {
      let result: Suggested[] | null
      try {
        result = await loadPeople(actorId)
      } catch {
        result = null
      }
      if (cancelled) return
      setPeople(result ?? [])
      setFailed(result === null)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [actorId])

  if (failed) {
    return (
      <p className="welcome__note" role="alert">
        Les propositions n’ont pas pu se charger.
      </p>
    )
  }
  if (!people || people.length === 0) return null
  return (
    <div className="welcome__grid">
      {people.map((person) => {
        const followed = on.has(person.id)
        return (
          <PersonCard
            key={person.id}
            name={person.name}
            meta={person.city ?? ''}
            avatarUrl={person.avatarUrl}
            reason={person.reason}
            action={
              <button
                type="button"
                className={followed ? 'pill-toggle' : 'pill-toggle pill-toggle--filled'}
                aria-pressed={followed}
                disabled={pending.has(person.id)}
                onClick={() => void toggle(person.id)}
              >
                {followed ? 'Suivi ✓' : 'Suivre'}
              </button>
            }
          />
        )
      })}
    </div>
  )
}
