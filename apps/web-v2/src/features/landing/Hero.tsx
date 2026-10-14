/**
 * QUOI     — l'accroche de la landing : le surtitre, « Ta saison de festivals, avec ceux qui la
 *            font. », la promesse, la recherche à trois champs et « Sans compte : l'annuaire est
 *            ouvert à tous ».
 * POURQUOI — maquette 2104:17 ; la landing parle d'abord aux exposants (décision du 07/10/2026).
 * ATTENTION — en attendant l'annuaire public (lot 11b), la recherche mène à la connexion ; 11b la
 *            branchera sur l'Explorer public.
 */
import { Search } from 'lucide-react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

export function Hero() {
  const navigate = useNavigate()

  function toLogin(event?: FormEvent) {
    event?.preventDefault()
    void navigate('/connexion')
  }

  return (
    <section className="landing-hero">
      <p className="landing-hero__eyebrow">Pour les exposants qui vivent de leur stand</p>
      <h1 className="landing-hero__title">Ta saison de festivals, avec ceux qui la font.</h1>
      <p className="landing-hero__lead">
        Trouve tes dates en voyant où vont tes amis, suis tes dossiers et tes paiements, et montre
        ton calendrier sur ton site. Gratuit pour commencer.
      </p>
      <form className="landing-search" role="search" onSubmit={toLogin}>
        <label className="landing-search__field landing-search__field--what">
          <span className="landing-search__label">Rechercher</span>
          <input className="landing-search__value" placeholder="Un festival, une ville…" />
        </label>
        <span className="landing-search__rule" aria-hidden />
        <button
          type="button"
          className="landing-search__field landing-search__field--where"
          onClick={() => {
            toLogin()
          }}
        >
          <span className="landing-search__label">Où</span>
          <span className="landing-search__value">Toute la France</span>
        </button>
        <span className="landing-search__rule" aria-hidden />
        <button
          type="button"
          className="landing-search__field landing-search__field--when"
          onClick={() => {
            toLogin()
          }}
        >
          <span className="landing-search__label">Quand</span>
          <span className="landing-search__value">Les 12 prochains mois</span>
        </button>
        <button type="submit" className="landing-search__submit" aria-label="Rechercher">
          <Search size={18} strokeWidth={2} />
        </button>
      </form>
      <p className="landing-hero__note">Sans compte : l’annuaire est ouvert à tous.</p>
    </section>
  )
}
