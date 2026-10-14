/**
 * QUOI     — « Tu n'y vas jamais seul. » : la discussion de chaque festival, en deux colonnes ; à
 *            droite, une notification et une discussion dessinées.
 * POURQUOI — maquette 2154:2 (mise à jour du 08/10/2026 : la communauté rend le calendrier
 *            meilleur).
 * ATTENTION — l'illustration n'est pas cliquable : ses faux boutons sont de simples `<span>`.
 */
const MESSAGES = [
  {
    initial: 'M',
    author: 'Marion · Corne & Cuir',
    text: 'À quelle heure ouvre l’installation vendredi ?',
  },
  {
    initial: 'L',
    author: 'Lucas · La Forge du Nord',
    text: '14 h, par le parking B. On est voisins, stand 12 !',
  },
]

export function Community() {
  return (
    <section className="landing-section landing-split">
      <div className="landing-split__text">
        <p className="landing-eyebrow">La communauté</p>
        <h2 className="landing-split__title">Tu n’y vas jamais seul.</h2>
        <p className="landing-split__lead">
          Chaque festival a sa discussion. Demande l’heure d’installation à ceux qui y vont,
          retrouve tes voisins de stand, prépare le week-end ensemble. Une question sur un festival
          où tu vas ? Tu es prévenu. Trop de bruit ? Tu mets la conversation en sourdine.
        </p>
      </div>
      <div className="landing-split__cards" aria-hidden>
        <div className="landing-note">
          <p className="landing-note__kicker">Nouvelle question</p>
          <p className="landing-note__text">
            Marion pose une question sur Arbor Pagan Fest, où tu vas aussi.
          </p>
        </div>
        <div className="landing-note landing-thread">
          <div className="landing-thread__head">
            <p className="landing-thread__title">Arbor Pagan Fest · Discussion</p>
            <span className="landing-thread__mute">Mettre en sourdine</span>
          </div>
          <div className="landing-thread__tabs">
            <span className="landing-thread__tab landing-thread__tab--on">Entre exposants</span>
            <span className="landing-thread__tab">Avec les festivaliers</span>
          </div>
          {MESSAGES.map((message) => (
            <div key={message.initial} className="landing-thread__message">
              <span className="landing-thread__face">{message.initial}</span>
              <div>
                <p className="landing-note__kicker">{message.author}</p>
                <p className="landing-note__text">{message.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
