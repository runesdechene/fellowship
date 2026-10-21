/**
 * QUOI     — « Ces festivals t'intéressent ? » : jusqu'à douze festivals de l'année à venir, ceux
 *            de la région d'abord, à marquer d'un clic.
 * POURQUOI — spec du 21/10/2026, maquette 2392:271 : un festival choisi devient « repéré »
 *            (participation `interesse`, l'upsert de l'Explorer) et nourrit « Pour toi ». Les choix
 *            déjà faits se relisent : un retour sur l'étape les montre cochés.
 * ATTENTION — une liste vide n'affiche rien ; une lecture ratée le dit. La base type ces colonnes
 *            non nulles, mais une fiche peut n'avoir ni affiche, ni ville, ni date de fin.
 */
import { useEffect, useState } from 'react'
import { DateCard } from '@/components/ui/DateCard'
import { formatDateRange, parseSqlDate } from '@/lib/dates'
import { must, supabase } from '@/lib/supabase'
import { useToggles } from './useToggles'

interface Festival {
  id: string
  name: string
  when: string
  imageUrl: string | null
  tags: string[]
}

async function loadFestivals(
  actorId: string,
): Promise<{ festivals: Festival[]; chosen: string[] }> {
  const rows = must(await supabase.rpc('welcome_festivals', { p_actor: actorId }))
  const marked = must(
    await supabase
      .from('participations')
      .select('event_id')
      .eq('actor_id', actorId)
      .eq('status', 'interesse')
      .in(
        'event_id',
        rows.map((row) => row.id),
      ),
  )
  const festivals = rows.map((row) => {
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
  return { festivals, chosen: marked.map((row) => row.event_id) }
}

async function mark(actorId: string, eventId: string, interested: boolean): Promise<boolean> {
  const { error } = interested
    ? await supabase
        .from('participations')
        .upsert(
          { actor_id: actorId, event_id: eventId, status: 'interesse' },
          { onConflict: 'actor_id,event_id' },
        )
    : await supabase.from('participations').delete().eq('actor_id', actorId).eq('event_id', eventId)
  return error === null
}

interface WelcomeFestivalsProps {
  actorId: string
  /** Le nombre de festivals proposés, une fois lus : sans eux, pas de « Aucun ne m'intéresse ». */
  onLoaded: (count: number) => void
}

export function WelcomeFestivals({ actorId, onLoaded }: WelcomeFestivalsProps) {
  const [festivals, setFestivals] = useState<Festival[] | null>(null)
  const [failed, setFailed] = useState(false)
  const { on, pending, seed, toggle } = useToggles((id, value) => mark(actorId, id, value))

  useEffect(() => {
    let cancelled = false
    async function load() {
      let result: Awaited<ReturnType<typeof loadFestivals>> | null
      try {
        result = await loadFestivals(actorId)
      } catch {
        result = null
      }
      if (cancelled) return
      setFestivals(result?.festivals ?? [])
      setFailed(result === null)
      seed(result?.chosen ?? [])
      onLoaded(result?.festivals.length ?? 0)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [actorId, seed, onLoaded])

  if (failed) {
    return (
      <p className="welcome__note" role="alert">
        Les festivals n’ont pas pu se charger.
      </p>
    )
  }
  if (!festivals || festivals.length === 0) return null
  return (
    <div className="welcome__grid welcome__grid--dates">
      {festivals.map((festival) => {
        const chosen = on.has(festival.id)
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
                className={chosen ? 'pill-toggle pill-toggle--filled' : 'pill-toggle'}
                aria-pressed={chosen}
                disabled={pending.has(festival.id)}
                onClick={() => void toggle(festival.id)}
              >
                {chosen ? 'Intéressé ✓' : 'Ça m’intéresse'}
              </button>
            }
          />
        )
      })}
    </div>
  )
}
