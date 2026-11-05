/**
 * QUOI     — la marque écrite : le pictogramme, « Fellowship » en Cabin et le point orange du logo.
 * POURQUOI — Uriel, 14/10/2026 : le même nom partout, sur la landing (en crème) et sur les pages
 *            d'entrée, connexion et inscription (en gris foncé).
 * ATTENTION — la couleur du nom, sa taille et celle du pictogramme viennent du contexte, par les
 *            variables de wordmark.css ; le pictogramme est décoratif, le nom se lit.
 *            `beta` : la pastille « Bêta » de l'application, qui prévient qu'il reste des bugs
 *            (Uriel, 05/11/2026, maquette 2776:361).
 */
export function Wordmark({ className, beta = false }: { className?: string; beta?: boolean }) {
  return (
    <span className={`wordmark${className ? ` ${className}` : ''}`}>
      <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" />
      <span>
        Fellowship<span className="wordmark__dot">.</span>
      </span>
      {beta && <span className="wordmark__beta">Bêta</span>}
    </span>
  )
}
