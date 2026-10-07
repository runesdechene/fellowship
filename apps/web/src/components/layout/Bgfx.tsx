/** Calque d'ambiance fixe (halos chauds) — DA « Nuit de Festival ». Monté une fois, derrière tout.
 *  Jamais dans une iframe (widget embed) : le widget doit rester transparent, sans halos. */
export function Bgfx() {
  if (typeof window !== 'undefined' && window.self !== window.top) return null
  return (
    <div className="bgfx" aria-hidden="true">
      <span className="b b1" />
      <span className="b b2" />
      <span className="b b3" />
      <span className="b b4" />
      <span className="b b5" />
    </div>
  )
}
