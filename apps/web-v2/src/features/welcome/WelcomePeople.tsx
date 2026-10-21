/**
 * QUOI     — « Tu les connais peut-être » : jusqu'à douze exposants du même métier, puis de la même
 *            région, à suivre d'un clic.
 * POURQUOI — spec du 21/10/2026, maquette 2392:65 : l'enseigne qui arrive repart reliée. Le suivi
 *            part au clic, comme dans la Communauté, et revient en arrière si l'écriture échoue.
 * ATTENTION — une liste vide n'affiche rien ; une lecture ratée le dit, sans passer pour une liste
 *            vide. Le bouton du formulaire mène à la suite dans tous les cas.
 */
import { useEffect, useState } from 'react'
import { PersonCard } from '@/components/ui/PersonCard'
import { must, supabase } from '@/lib/supabase'

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
    reason: row.reason === 'craft' ? 'Même métier' : 'Près de chez toi',
  }))
}

export function WelcomePeople({ actorId }: { actorId: string }) {
  const [people, setPeople] = useState<Suggested[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [followed, setFollowed] = useState<ReadonlySet<string>>(new Set())

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

  async function toggle(id: string) {
    const following = !followed.has(id)
    const apply = (on: boolean) => {
      setFollowed((current) => {
        const next = new Set(current)
        if (on) next.add(id)
        else next.delete(id)
        return next
      })
    }
    apply(following)
    const { error } = following
      ? await supabase.from('follows').insert({ follower_actor: actorId, following_actor: id })
      : await supabase
          .from('follows')
          .delete()
          .eq('follower_actor', actorId)
          .eq('following_actor', id)
    if (error) apply(!following)
  }

  if (failed) return <p className="welcome__note">Les propositions n’ont pas pu se charger.</p>
  if (!people || people.length === 0) return null
  return (
    <div className="welcome__grid">
      {people.map((person) => {
        const on = followed.has(person.id)
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
                className={on ? 'pill-toggle' : 'pill-toggle pill-toggle--filled'}
                aria-pressed={on}
                onClick={() => void toggle(person.id)}
              >
                {on ? 'Suivi ✓' : 'Suivre'}
              </button>
            }
          />
        )
      })}
    </div>
  )
}
