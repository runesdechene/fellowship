/**
 * QUOI     — la bande Festivaliers : « Dis à ton public où te retrouver. » et un message dessiné.
 * POURQUOI — maquette 2154:34 ; les festivaliers sont un atout de l'exposant, pas des clients
 *            (décision du 08/10/2026).
 * ATTENTION — le message est une illustration, pas une donnée.
 */
export function Festivalgoers() {
  return (
    <section className="landing-section landing-goers-wrap">
      <div className="landing-goers">
        <div className="landing-goers__text">
          <p className="landing-eyebrow">Festivaliers</p>
          <h2 className="landing-goers__title">Dis à ton public où te retrouver.</h2>
          <p className="landing-goers__lead">
            Dans chaque festival, un espace avec ceux qui viennent vraiment : ton stand, tes
            nouveautés, leurs questions. Ton public, pas tout Instagram.
          </p>
        </div>
        <div className="landing-note landing-goers__note" aria-hidden>
          <p className="landing-note__kicker">
            Atelier Corne &amp; Cuir → les festivaliers d’Arbor Pagan Fest
          </p>
          <p className="landing-note__text">
            On sera à l’allée des Forges, stand 12. Passez nous voir, il y aura les nouvelles
            ceintures !
          </p>
        </div>
      </div>
    </section>
  )
}
