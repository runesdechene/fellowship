/**
 * QUOI     — la marque écrite : le pictogramme, « Fellowship » en Cabin et le point orange du logo.
 * POURQUOI — Uriel, 14/10/2026 : le même nom partout, sur la landing (en crème) et sur les pages
 *            d'entrée, connexion et inscription (en gris foncé).
 * ATTENTION — la couleur du nom, sa taille et celle du pictogramme viennent du contexte, par les
 *            variables de wordmark.css ; le pictogramme est décoratif, le nom se lit.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`wordmark${className ? ` ${className}` : ''}`}>
      <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" />
      <span>
        Fellowship<span className="wordmark__dot">.</span>
      </span>
    </span>
  )
}
