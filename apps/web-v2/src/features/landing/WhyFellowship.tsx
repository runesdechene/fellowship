/**
 * QUOI     — « Pourquoi Fellowship » : l'histoire, en deux colonnes, signée Uriel.
 * POURQUOI — maquette 2105:8 ; texte d'Uriel, relu et validé le 08/10/2026.
 * ATTENTION — le texte est le sien, au caractère près : on ne le réécrit pas.
 */
export function WhyFellowship() {
  return (
    <section className="landing-section landing-why">
      <div className="landing-why__head">
        <p className="landing-eyebrow">Pourquoi Fellowship</p>
        <h2 className="landing-why__title">
          On se rencontre sur les marchés. Puis on se perd de vue.
        </h2>
      </div>
      <div className="landing-why__story">
        <p>
          Sur chaque marché, on croise des gens formidables : un voisin de stand qui te souffle la
          bonne date, une créatrice qui te prête main forte, un organisateur qui te propose de venir
          l’an prochain...
        </p>
        <p>
          Et puis le week-end se termine. On oublie, on ne se revoit plus, on se perd de vue. Les
          kilomètres effacent la mémoire.
        </p>
        <p>
          Être exposant, c’est une vraie aventure nomade et humaine. Fellowship est né pour la
          rendre plus simple, plus facile. Faciliter l’organisation. Apaiser l’esprit. Se concentrer
          sur ce qu’on aime faire.
        </p>
        <p>
          Il s’agit de l’outil que nous utilisons en interne depuis 2025 chez{' '}
          <strong>
            <em>Runes de Chêne - Portez l’Histoire</em>
          </strong>
          .
        </p>
        <p>Aujourd’hui on vous y ouvre l’accès.</p>
        <div className="landing-why__signature">
          <img
            src={`${import.meta.env.BASE_URL}runes-de-chene.png`}
            alt=""
            width={48}
            height={48}
          />
          <div>
            <p className="landing-why__name">Uriel</p>
            <p className="landing-why__role">
              Exposant avec Runes de Chêne, fondateur de Fellowship
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
