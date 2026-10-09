/**
 * QUOI     — l'écran Explorer (/explorer) : le titre, la recherche, les catégories, puis soit les
 *            trois rangées de l'accueil, soit les résultats d'une recherche.
 * POURQUOI — trouver où poser son stand : par ses amis, par la nouveauté, près de chez soi, ou en
 *            cherchant un mot (maquette 2027).
 * ATTENTION — tout l'état vit dans l'adresse (?q, ?ou, ?quand, ?categorie, ?voir) : le retour du
 *            navigateur ramène la recherche d'avant. La barre se remonte quand l'adresse change.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { nameLine } from '@/lib/name-line'
import { fetchTags, type TagRow } from '@/lib/tags'
import { CategoryChips } from './CategoryChips'
import { EventRail } from './EventRail'
import { SearchBar } from './SearchBar'
import { usePlan } from '@/lib/usePlan'
import { SearchResults } from './SearchResults'
import { useExplorer } from './useExplorer'

type Tab = 'tout' | 'festivals' | 'exposants'

function readTab(value: string | null): Tab {
  return value === 'festivals' || value === 'exposants' ? value : 'tout'
}

export function ExplorerPage() {
  const { actor } = useAuth()
  const [params, setParams] = useSearchParams()
  const [tags, setTags] = useState<TagRow[]>([])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const rows = await fetchTags()
      if (!cancelled) setTags(rows)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const q = params.get('q') ?? ''
  const ou = params.get('ou') ?? ''
  const quand = params.get('quand')
  const categorie = params.get('categorie')
  const tab = readTab(params.get('voir'))
  const tagRow = tags.find((tag) => tag.slug === categorie) ?? null
  const tag = tagRow ? { name: tagRow.name, slug: tagRow.slug } : null

  const { pro } = usePlan()
  const data = useExplorer({ q, ou, quand, tag }, actor?.id, pro)

  /** Réécrit l'adresse : une valeur vide s'efface plutôt que de traîner en « ?q= ». */
  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }

  const friendsLine = nameLine(data.friendNames, {
    one: 'a prévu des dates',
    many: 'ont prévu des dates',
  })

  return (
    <div className="explorer">
      {!data.searching && (
        <header className="explorer__head">
          <h1 className="explorer__title">Explorer</h1>
          <p className="explorer__subtitle">
            Les festivals et marchés où les exposants indépendants vendent sur stand.
          </p>
        </header>
      )}

      <SearchBar
        pro={pro}
        key={`${q}|${ou}|${quand ?? ''}`}
        q={q}
        ou={ou}
        quand={quand}
        onSearch={(next) => {
          update({
            q: next.q,
            ou: next.ou,
            quand: next.quand === '12' ? null : next.quand,
            voir: null,
          })
        }}
      />

      <CategoryChips
        tags={tags}
        selected={categorie}
        onSelect={(slug) => {
          update({ categorie: slug })
        }}
      />

      {data.error && <p className="explorer__state">{data.error}</p>}
      {data.loading && <p className="explorer__state">Chargement…</p>}

      {!data.loading &&
        !data.error &&
        (data.searching ? (
          <SearchResults
            label={q || ou}
            events={data.results}
            exhibitors={data.exhibitors}
            hiddenCount={data.hiddenCount}
            tab={tab}
            onTab={(next) => {
              update({ voir: next === 'tout' ? null : next })
            }}
            onMark={(event) => void data.toggleMark(event)}
            onFollow={(exhibitor) => void data.toggleFollow(exhibitor)}
          />
        ) : (
          <>
            <EventRail
              title="Où vont tes amis"
              subtitle={friendsLine ? `${friendsLine.first}${friendsLine.rest}` : null}
              events={data.friends}
              onMark={(event) => void data.toggleMark(event)}
              hiddenCount={data.hiddenCount}
            />
            <EventRail
              title="Ajoutés récemment"
              subtitle="Les dernières dates entrées par la communauté"
              events={data.recent}
              onMark={(event) => void data.toggleMark(event)}
              hiddenCount={data.hiddenCount}
            />
            <EventRail
              title="Près de chez toi"
              subtitle={data.nearLabel ? `Dans ton département (${data.nearLabel})` : null}
              events={data.near}
              onMark={(event) => void data.toggleMark(event)}
              hiddenCount={data.hiddenCount}
            />
          </>
        ))}
    </div>
  )
}
