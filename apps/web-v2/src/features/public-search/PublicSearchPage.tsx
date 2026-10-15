/**
 * QUOI     — la recherche publique (/festivals) : la recherche, « N festivals dans les 3 prochains
 *            mois. », six affiches puis toutes, ce qui attend au-delà, le pied de page.
 * POURQUOI — lot 11b, maquette 2314:2 : sans compte, on fouille 3 mois (règle du 14/10/2026) ; la
 *            suite se débloque avec un compte gratuit (6 mois) ou le Pro (toute l'année).
 * ATTENTION — tout l'état vit dans l'adresse (?q, ?ou, ?quand, ?tout) ; un compte connecté est
 *            renvoyé sur l'Explorer par la route (App.tsx).
 */
import { ArrowRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { LandingBand } from '@/features/landing/LandingBand'
import { LandingFoot } from '@/features/landing/LandingFoot'
import { LandingSearch } from '@/features/landing/LandingSearch'
import { LandingTopBar } from '@/features/landing/LandingTopBar'
import { GUEST_MONTHS, beyondTitle, lastOpenMonth, publicTitle, windowMonths } from '@/lib/explorer'
import { PublicEventCard } from './PublicEventCard'
import { usePublicSearch } from './usePublicSearch'

/** La maquette montre six affiches avant « Voir les N festivals ». */
const PREVIEW = 6

export function PublicSearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const ou = params.get('ou') ?? ''
  const quand = params.get('quand')
  const all = params.has('tout')
  const data = usePublicSearch({ q, ou, quand, tag: null })
  const shown = all ? data.events : data.events.slice(0, PREVIEW)
  const posters = data.events.flatMap((event) => (event.imageUrl ? [event.imageUrl] : []))

  const withAll = new URLSearchParams(params)
  withAll.set('tout', '')

  return (
    <div className="landing public-search">
      <LandingTopBar away />
      <LandingBand tone="earth" slant="fall" posters={posters} className="public-search__head">
        <LandingSearch key={`${q}|${ou}|${quand ?? ''}`} q={q} ou={ou} quand={quand} />
        {!data.loading && !data.error && (
          <h1 className="public-search__title">
            {publicTitle(data.total, q || ou, windowMonths(quand, GUEST_MONTHS))}
          </h1>
        )}
        <p className="public-search__lead">
          Ajoutés et tenus à jour par les exposants eux-mêmes, dans toute la France.
        </p>
      </LandingBand>

      <LandingBand tone="paper" slant="rise" className="public-search__results">
        {data.error && <p className="public-search__state">{data.error}</p>}
        {data.loading && <p className="public-search__state">Chargement…</p>}
        {!data.loading && !data.error && (
          <>
            {shown.length === 0 && (
              <p className="public-search__state">Essaie un autre mot, ou une autre ville.</p>
            )}
            {shown.length > 0 && (
              <div className="public-search__grid">
                {shown.map((event) => (
                  <PublicEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
            {!all && data.total > PREVIEW && (
              <Link className="public-search__more" to={`?${withAll.toString()}`}>
                Voir les {data.total} festivals
                <ArrowRight size={18} strokeWidth={2} aria-hidden />
              </Link>
            )}
          </>
        )}
      </LandingBand>

      <LandingBand tone="night" slant="rise" posters={posters} className="landing-end">
        {data.hiddenCount > 0 && (
          <div className="public-search__beyond">
            <p className="landing-statement">
              <strong>
                {beyondTitle(data.hiddenCount, lastOpenMonth(new Date(), GUEST_MONTHS))}
              </strong>{' '}
              Crée ton compte gratuit pour voir davantage dans le futur, ajouter tes dates et suivre
              tes collègues exposants.
            </p>
            <div className="landing-pro__ctas">
              <Link className="landing-button landing-button--brand" to="/connexion">
                Créer mon compte gratuit
                <ArrowRight size={18} strokeWidth={2} aria-hidden />
              </Link>
              <Link className="landing-pro__more" to="/pro">
                Découvrir le Pro
                <ArrowRight size={18} strokeWidth={2} aria-hidden />
              </Link>
            </div>
          </div>
        )}
        <LandingFoot away />
      </LandingBand>
    </div>
  )
}
