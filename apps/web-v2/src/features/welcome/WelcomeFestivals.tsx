/**
 * QUOI     — « Ces festivals t'intéressent ? » : jusqu'à douze festivals de l'année à venir, ceux
 *            de la région d'abord, à marquer d'un clic.
 * POURQUOI — spec du 21/10/2026, maquette 2392:271 : un festival choisi devient « repéré »
 *            (participation `interesse`, l'upsert de l'Explorer) et nourrit « Pour toi ».
 * ATTENTION — une liste vide n'affiche rien ; une lecture ratée le dit. La base type ces colonnes
 *            non nulles, mais une fiche peut n'avoir ni affiche, ni ville, ni date de fin.
 */
import { useEffect, useState } from 'react'
import { DateCard } from '@/components/ui/DateCard'
import { formatDateRange, parseSqlDate } from '@/lib/dates'
import { must, supabase } from '@/lib/supabase'

interface Festival {
  id: string
  name: string
  when: string
  imageUrl: string | null
  tags: string[]
}

async function loadFestivals(actorId: string): Promise<Festival[]> {
  const rows = must(await supabase.rpc('welcome_festivals', { p_actor: actorId }))
  return rows.map((row) => {
    const period = formatDateRange(
      parseSqlDate(row.start_date),
      parseSqlDate(row.end_date || row.start_date),
    )
    return {
      id: row.id,
      name: row.name,
      when: row.city ? `${period} · ${row.city}` : period,
      imageUrl: row.image_url || null,
      tags: row.tags,
    }
  })
}

export function WelcomeFestivals({ actorId }: { actorId: string }) {
  const [festivals, setFestivals] = useState<Festival[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    async function load() {
      let result: Festival[] | null
      try {
        result = await loadFestivals(actorId)
      } catch {
        result = null
      }
      if (cancelled) return
      setFestivals(result ?? [])
      setFailed(result === null)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [actorId])

  async function toggle(eventId: string) {
    const interested = !chosen.has(eventId)
    const apply = (on: boolean) => {
      setChosen((current) => {
        const next = new Set(current)
        if (on) next.add(eventId)
        else next.delete(eventId)
        return next
      })
    }
    apply(interested)
    const { error } = interested
      ? await supabase
          .from('participations')
          .upsert(
            { actor_id: actorId, event_id: eventId, status: 'interesse' },
            { onConflict: 'actor_id,event_id' },
          )
      : await supabase
          .from('participations')
          .delete()
          .eq('actor_id', actorId)
          .eq('event_id', eventId)
    if (error) apply(!interested)
  }

  if (failed) return <p className="welcome__note">Les festivals n’ont pas pu se charger.</p>
  if (!festivals || festivals.length === 0) return null
  return (
    <div className="welcome__grid welcome__grid--dates">
      {festivals.map((festival) => {
        const on = chosen.has(festival.id)
        return (
          <DateCard
            key={festival.id}
            name={festival.name}
            when={festival.when}
            imageUrl={festival.imageUrl}
            tags={festival.tags}
            action={
              <button
                type="button"
                className={on ? 'pill-toggle pill-toggle--filled' : 'pill-toggle'}
                aria-pressed={on}
                onClick={() => void toggle(festival.id)}
              >
                {on ? 'Intéressé ✓' : 'Ça m’intéresse'}
              </button>
            }
          />
        )
      })}
    </div>
  )
}
