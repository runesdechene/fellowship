/**
 * QUOI     — « Pourquoi j'ai créé Fellowship », la lettre d'Uriel.
 * POURQUOI — maquette du 26/11/2026. Les faits viennent de la FAQ et du pied de page.
 * ATTENTION — l'ancre `assistant` est celle de « Pourquoi Fellowship » au pied de page.
 */
export function Letter() {
  return (
    <section id="assistant" className="discover-letter">
      <h2>Pourquoi j’ai créé Fellowship</h2>
      <p>
        Salut, moi c’est <strong>Uriel</strong>, artiste, entrepreneur, exposant et fondateur de
        Runes de Chêne.
      </p>
      <p>
        Fellowship est né sur mes stands en 2024, d’une saison qui tenait sur des post‑it, un
        tableau Excel et des « c’est quoi ta prochaine date ? ». D’abord partagé entre collègues, il
        est aujourd’hui ouvert à toute la communauté des exposants, créateurs et artisans nomades.
      </p>
      <p>Je le construis avec trois choses en tête :</p>
      <ol>
        <li>
          <strong>La base est gratuite.</strong> Sans carte bancaire, sans limite de durée.
        </li>
        <li>
          <strong>Entre exposants.</strong> Tu vois où vont les autres et ce qu’ils en pensent.
        </li>
        <li>
          <strong>Il s’occupe du reste.</strong> Toi, tu choisis tes festivals et tu fabriques.
        </li>
      </ol>
    </section>
  )
}
